
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// Set up CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Fetching all pending matches...');
    
    // Query for all pending matches
    const { data: pendingMatches, error: matchError } = await supabase
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        requester_request_id,
        acceptor_request_id,
        match_date,
        requester_shift_id,
        acceptor_shift_id
      `)
      .eq('status', 'pending');
    
    if (matchError) {
      console.error('Error fetching pending matches:', matchError);
      throw matchError;
    }
    
    console.log(`Found ${pendingMatches?.length || 0} pending matches`);
    
    if (!pendingMatches || pendingMatches.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        emailsSent: 0,
        message: 'No pending matches found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Array to track emails we've already sent to (avoid duplicates)
    const emailsSent = new Set();
    
    // Process each pending match
    for (const match of pendingMatches) {
      try {
        console.log(`Processing match ${match.id}`);
        
        // Get the requests associated with this match
        const { data: requests, error: requestError } = await supabase
          .from('shift_swap_requests')
          .select(`
            id,
            requester_id,
            requester_shift_id
          `)
          .in('id', [match.requester_request_id, match.acceptor_request_id]);
        
        if (requestError || !requests) {
          console.error(`Error fetching requests for match ${match.id}:`, requestError);
          continue;
        }
        
        // Get user profiles for requesters
        const userIds = requests.map(r => r.requester_id);
        
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(`id, first_name, last_name, employee_id, organization`)
          .in('id', userIds);
        
        if (profileError || !profiles) {
          console.error(`Error fetching profiles for match ${match.id}:`, profileError);
          continue;
        }
        
        // Get user emails
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError || !users.users) {
          console.error('Error fetching users:', userError);
          continue;
        }
        
        // Map user IDs to profiles and emails
        const userMap = new Map();
        
        // Create profile map
        const profileMap = profiles.reduce((map: Record<string, any>, profile) => {
          map[profile.id] = profile;
          return map;
        }, {});
        
        // Create user/email map
        users.users.forEach(user => {
          if (userIds.includes(user.id)) {
            userMap.set(user.id, {
              email: user.email,
              profile: profileMap[user.id] || { first_name: 'Unknown', last_name: 'User' }
            });
          }
        });
        
        // Get shift details
        const shiftIds = [match.requester_shift_id, match.acceptor_shift_id];
        const { data: shifts, error: shiftError } = await supabase
          .from('shifts')
          .select('id, date, start_time, end_time, truck_name, colleague_type')
          .in('id', shiftIds);
        
        if (shiftError || !shifts) {
          console.error(`Error fetching shifts for match ${match.id}:`, shiftError);
          continue;
        }
        
        // Create shift map
        const shiftMap = shifts.reduce((map: Record<string, any>, shift) => {
          map[shift.id] = shift;
          return map;
        }, {});
        
        // For each user in this match, send an email
        for (const request of requests) {
          const userData = userMap.get(request.requester_id);
          
          if (!userData || !userData.email) {
            console.log(`No user data or email found for user ${request.requester_id}`);
            continue;
          }
          
          // Skip if we already sent an email to this user
          if (emailsSent.has(userData.email)) {
            console.log(`Already sent email to ${userData.email}, skipping duplicate`);
            continue;
          }
          
          // Find the other request in this match
          const otherRequest = requests.find(r => r.id !== request.id);
          if (!otherRequest) continue;
          
          // Get other user data
          const otherUserData = userMap.get(otherRequest.requester_id);
          if (!otherUserData) continue;
          
          // Get shift data
          const myShift = shiftMap[request.requester_shift_id];
          const otherShift = shiftMap[otherRequest.requester_shift_id];
          
          if (!myShift || !otherShift) {
            console.log(`Missing shift data for match ${match.id}`);
            continue;
          }
          
          // Format date and time for display
          const formatDate = (dateStr: string) => {
            try {
              const date = new Date(dateStr);
              return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            } catch (e) {
              return dateStr;
            }
          };
          
          const formatTime = (timeStr: string) => {
            try {
              // The timeStr is something like "08:00:00"
              const [hours, minutes] = timeStr.split(':').map(Number);
              const date = new Date();
              date.setHours(hours, minutes);
              return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
              return timeStr;
            }
          };
          
          // Prepare email content
          const subject = "You have a potential shift swap match!";
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <h2 style="color: #2563eb; margin-bottom: 20px;">Shift Swap Match Found</h2>
              
              <p>Hello ${userData.profile.first_name || 'there'},</p>
              
              <p>We've found a potential match for your shift swap request!</p>
              
              <div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
                <h3 style="margin-top: 0;">Your Shift</h3>
                <p>
                  <strong>Date:</strong> ${formatDate(myShift.date)}<br>
                  <strong>Time:</strong> ${formatTime(myShift.start_time)} - ${formatTime(myShift.end_time)}<br>
                  <strong>Truck:</strong> ${myShift.truck_name || 'Not specified'}<br>
                  <strong>Type:</strong> ${myShift.colleague_type || 'Standard'}
                </p>
              </div>
              
              <div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
                <h3 style="margin-top: 0;">Matched With</h3>
                <p>
                  <strong>Colleague:</strong> ${otherUserData.profile.first_name || ''} ${otherUserData.profile.last_name || ''} (${otherUserData.profile.employee_id || 'ID not available'})<br>
                  <strong>Date:</strong> ${formatDate(otherShift.date)}<br>
                  <strong>Time:</strong> ${formatTime(otherShift.start_time)} - ${formatTime(otherShift.end_time)}<br>
                  <strong>Truck:</strong> ${otherShift.truck_name || 'Not specified'}<br>
                  <strong>Type:</strong> ${otherShift.colleague_type || 'Standard'}
                </p>
              </div>
              
              <p>Please log in to the system to review and accept this swap if it works for you.</p>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 14px; color: #666;">
                This is an automated notification from the Shift Swap system.
              </p>
            </div>
          `;
          
          // Send the email
          try {
            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send_email', {
              body: {
                to: userData.email,
                subject,
                html,
                verbose_logging: true
              }
            });
            
            if (emailError) {
              console.error(`Error sending email to ${userData.email}:`, emailError);
              continue;
            }
            
            console.log(`Successfully sent email to ${userData.email}:`, emailResult);
            emailsSent.add(userData.email);
          } catch (emailErr) {
            console.error(`Exception sending email to ${userData.email}:`, emailErr);
          }
        }
      } catch (matchProcessError) {
        console.error(`Error processing match ${match.id}:`, matchProcessError);
      }
    }
    
    console.log(`Notification process complete. Sent emails to ${emailsSent.size} unique users.`);
    
    return new Response(JSON.stringify({
      success: true,
      emailsSent: emailsSent.size,
      message: `Successfully sent notifications to ${emailsSent.size} users`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Error in notify_pending_matches function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
