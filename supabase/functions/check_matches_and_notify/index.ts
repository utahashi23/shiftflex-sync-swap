
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Set up CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SwapMatch {
  match_id: string;
  match_status: string;
  created_at: string;
  match_date: string;
  my_request_id: string;
  other_request_id: string;
  my_shift_id: string;
  my_shift_date: string;
  my_shift_start_time: string;
  my_shift_end_time: string;
  my_shift_truck: string;
  my_shift_colleague_type: string;
  my_employee_id: string;
  other_shift_id: string;
  other_shift_date: string;
  other_shift_start_time: string;
  other_shift_end_time: string;
  other_shift_truck: string;
  other_shift_colleague_type: string;
  other_employee_id: string;
  other_user_id: string;
  other_user_name: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting scheduled check for matched swaps");
    
    // Get request parameters
    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.log("No request body or invalid JSON, using defaults");
    }
    
    const debug = requestBody.debug === true;
    const timestamp = requestBody.triggered_at || new Date().toISOString();
    const isScheduled = requestBody.scheduled !== false;
    const viewUrl = requestBody.view_url || "https://www.shiftflex.au/shifts";
    
    // Log execution context
    console.log(`Check execution details: timestamp=${timestamp}, scheduled=${isScheduled}, debug=${debug}`);
    
    // Create Supabase client using service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    console.log(`Creating admin client with URL: ${supabaseUrl.substring(0, 20)}...`);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get all pending matches
    console.log("Fetching pending matches...");
    const { data: pendingMatches, error: matchesError } = await supabase
      .from('shift_swap_potential_matches')
      .select('*')
      .eq('status', 'pending');
      
    if (matchesError) {
      throw new Error(`Error fetching pending matches: ${matchesError.message}`);
    }
    
    console.log(`Found ${pendingMatches?.length || 0} pending matches`);
    
    if (!pendingMatches || pendingMatches.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No pending matches found", 
          processed: 0,
          emails_sent: 0,
          timestamp
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // For each match, collect all necessary data for notification
    let processedCount = 0;
    const userMatchMap: Record<string, SwapMatch[]> = {};
    
    for (const match of pendingMatches) {
      if (debug) {
        console.log(`Processing match: ${match.id}`);
      }
      
      // Get request details for both sides
      const { data: requesterRequest } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.requester_request_id)
        .single();
        
      const { data: acceptorRequest } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.acceptor_request_id)
        .single();
      
      if (!requesterRequest || !acceptorRequest) {
        console.log(`Skipping match ${match.id} - missing request data`);
        continue;
      }
      
      // Get shift details
      const { data: requesterShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', match.requester_shift_id)
        .single();
        
      const { data: acceptorShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', match.acceptor_shift_id)
        .single();
      
      if (!requesterShift || !acceptorShift) {
        console.log(`Skipping match ${match.id} - missing shift data`);
        continue;
      }
      
      // Get user profiles
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', requesterRequest.requester_id)
        .single();
        
      const { data: acceptorProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', acceptorRequest.requester_id)
        .single();
      
      if (!requesterProfile || !acceptorProfile) {
        console.log(`Skipping match ${match.id} - missing profile data`);
        continue;
      }
      
      // Get user emails from auth table
      const { data: requesterUser } = await supabase.auth.admin.getUserById(
        requesterRequest.requester_id
      );
      
      const { data: acceptorUser } = await supabase.auth.admin.getUserById(
        acceptorRequest.requester_id
      );
      
      if (!requesterUser?.user || !acceptorUser?.user) {
        console.log(`Skipping match ${match.id} - missing user data`);
        continue;
      }
      
      if (debug) {
        console.log(`User emails: requester=${requesterUser.user.email}, acceptor=${acceptorUser.user.email}`);
      }
      
      // Format match data for each user
      const formatMatchForUser = (
        userId: string, 
        userProfile: any, 
        userShift: any, 
        otherProfile: any, 
        otherShift: any
      ): SwapMatch => ({
        match_id: match.id,
        match_status: match.status,
        created_at: match.created_at,
        match_date: match.match_date,
        my_request_id: userId === requesterRequest.requester_id ? requesterRequest.id : acceptorRequest.id,
        other_request_id: userId === requesterRequest.requester_id ? acceptorRequest.id : requesterRequest.id,
        my_shift_id: userShift.id,
        my_shift_date: userShift.date,
        my_shift_start_time: userShift.start_time,
        my_shift_end_time: userShift.end_time,
        my_shift_truck: userShift.truck_name || "No truck assigned",
        my_shift_colleague_type: userShift.colleague_type || "Unknown",
        my_employee_id: userProfile.employee_id || "Not specified",
        other_shift_id: otherShift.id,
        other_shift_date: otherShift.date,
        other_shift_start_time: otherShift.start_time,
        other_shift_end_time: otherShift.end_time,
        other_shift_truck: otherShift.truck_name || "No truck assigned",
        other_shift_colleague_type: otherShift.colleague_type || "Unknown",
        other_employee_id: otherProfile.employee_id || "Not specified",
        other_user_id: otherProfile.id,
        other_user_name: `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() || "Unknown User",
        user_id: userId
      });
      
      // Add match data to each user's list of matches
      const requesterMatchData = formatMatchForUser(
        requesterRequest.requester_id,
        requesterProfile,
        requesterShift,
        acceptorProfile,
        acceptorShift
      );
      
      const acceptorMatchData = formatMatchForUser(
        acceptorRequest.requester_id,
        acceptorProfile,
        acceptorShift,
        requesterProfile,
        requesterShift
      );
      
      if (!userMatchMap[requesterRequest.requester_id]) {
        userMatchMap[requesterRequest.requester_id] = [];
      }
      if (!userMatchMap[acceptorRequest.requester_id]) {
        userMatchMap[acceptorRequest.requester_id] = [];
      }
      
      userMatchMap[requesterRequest.requester_id].push(requesterMatchData);
      userMatchMap[acceptorRequest.requester_id].push(acceptorMatchData);
      
      // Track processed matches
      processedCount++;
    }
    
    // Send emails to users
    let emailsSent = 0;
    for (const userId in userMatchMap) {
      const matches = userMatchMap[userId];
      
      // Get user details
      let email: string | undefined;
      let fullName = "User";
      
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        email = userData.user.email;
        
        // Get profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
          
        if (profile) {
          fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "User";
        }
      } else {
        console.log(`Skipping user ${userId} - no email found`);
        continue;
      }
      
      if (email) {
        // Craft and send email
        try {
          console.log(`Attempting to send notification email to ${email} (${userId}) about ${matches.length} matches`);
          
          const emailResult = await sendMatchNotificationEmail(email, fullName, matches, viewUrl);
          
          if (emailResult.success) {
            emailsSent++;
            console.log(`Successfully sent notification email to ${email} (${userId})`);
            
            if (debug) {
              console.log(`Email result:`, emailResult);
            }
          } else {
            console.error(`Failed to send email to ${email} (${userId}): ${emailResult.error}`);
          }
        } catch (emailError: any) {
          console.error(`Error sending email to ${email} (${userId}):`, emailError);
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Match notification process completed", 
        processed: processedCount,
        emails_sent: emailsSent,
        timestamp
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error in check_matches_and_notify function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

/**
 * Send notification email about matched swaps to a user
 */
async function sendMatchNotificationEmail(
  toEmail: string, 
  userName: string, 
  matches: SwapMatch[],
  viewUrl: string = "https://www.shiftflex.au/shifts"
): Promise<{success: boolean, error?: string, id?: string}> {
  try {
    console.log(`Preparing email for ${userName} (${toEmail}) with ${matches.length} matches`);
    
    // Create HTML content for the matches
    let matchesHtml = '';
    
    matches.forEach((match, index) => {
      matchesHtml += `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
          <h3 style="color: #2563eb; margin-top: 0;">Potential Swap #${index + 1}</h3>
          
          <div style="display: flex; margin-bottom: 10px;">
            <div style="flex: 1; padding-right: 10px;">
              <h4 style="margin-top: 0; margin-bottom: 5px;">Your Shift</h4>
              <p style="margin: 0;"><strong>Date:</strong> ${match.my_shift_date}</p>
              <p style="margin: 0;"><strong>Time:</strong> ${match.my_shift_start_time} - ${match.my_shift_end_time}</p>
              <p style="margin: 0;"><strong>Location:</strong> ${match.my_shift_truck}</p>
              <p style="margin: 0;"><strong>Role:</strong> ${match.my_shift_colleague_type}</p>
              <p style="margin: 0;"><strong>Employee ID:</strong> ${match.my_employee_id}</p>
            </div>
            
            <div style="flex: 1; padding-left: 10px;">
              <h4 style="margin-top: 0; margin-bottom: 5px;">Swap With</h4>
              <p style="margin: 0;"><strong>Colleague:</strong> ${match.other_user_name}</p>
              <p style="margin: 0;"><strong>Date:</strong> ${match.other_shift_date}</p>
              <p style="margin: 0;"><strong>Time:</strong> ${match.other_shift_start_time} - ${match.other_shift_end_time}</p>
              <p style="margin: 0;"><strong>Location:</strong> ${match.other_shift_truck}</p>
              <p style="margin: 0;"><strong>Role:</strong> ${match.other_shift_colleague_type}</p>
              <p style="margin: 0;"><strong>Employee ID:</strong> ${match.other_employee_id}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 15px;">
            <a href="${viewUrl}" 
               style="background-color: #2563eb; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              View Swap Details
            </a>
          </div>
        </div>
      `;
    });
    
    // Build the full HTML email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Shift Swap Matches Available</h2>
        
        <p>Hello ${userName},</p>
        
        <p>We've found ${matches.length} potential shift ${matches.length === 1 ? 'swap' : 'swaps'} that match your preferences. 
        Please review these opportunities and take action in the app:</p>
        
        ${matchesHtml}
        
        <p>These matches will remain available until someone accepts them or they are canceled.</p>
        
        <p>Thank you for using the Shift Swap system!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 14px; color: #666;">
          <p>This is an automated message from the Shift Swap system.</p>
        </div>
      </div>
    `;
    
    // Prepare email data
    const emailData = {
      to: toEmail,
      subject: `You have ${matches.length} pending shift ${matches.length === 1 ? 'swap' : 'swaps'} available`,
      html: emailHtml,
      from: "admin@shiftflex.au"
    };
    
    console.log(`Sending email to ${toEmail} with subject: "${emailData.subject}"`);
    
    // Use service role client to call the send_email function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Call the send_email function
    const { data, error } = await supabase.functions.invoke('send_email', {
      body: emailData
    });
    
    if (error) {
      throw new Error(`Email sending failed: ${error.message}`);
    }
    
    console.log(`Email sent successfully to ${toEmail}`);
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error(`Error sending match notification email:`, error);
    return { success: false, error: error.message || String(error) };
  }
}
