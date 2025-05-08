
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
    
    // Create Supabase client using service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get all pending matches
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
          processed: 0 
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
          await sendMatchNotificationEmail(email, fullName, matches);
          emailsSent++;
          console.log(`Sent notification email to ${email} (${userId}) about ${matches.length} matches`);
        } catch (emailError) {
          console.error(`Failed to send email to ${email} (${userId}):`, emailError);
        }
      }
    }
    
    // For testing purposes - send to specific user if requested
    const { triggered_at, test_user_id } = await req.json().catch(() => ({ triggered_at: new Date().toISOString() }));
    if (test_user_id) {
      console.log(`Running test email for user ID: ${test_user_id}`);
      await sendTestMatchEmail(test_user_id);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Match notification process completed", 
        processed: processedCount,
        emails_sent: emailsSent,
        triggered_at
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in check_matches_and_notify function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || String(error) 
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
  matches: SwapMatch[]
): Promise<void> {
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
          </div>
          
          <div style="flex: 1; padding-left: 10px;">
            <h4 style="margin-top: 0; margin-bottom: 5px;">Swap With</h4>
            <p style="margin: 0;"><strong>Colleague:</strong> ${match.other_user_name}</p>
            <p style="margin: 0;"><strong>Date:</strong> ${match.other_shift_date}</p>
            <p style="margin: 0;"><strong>Time:</strong> ${match.other_shift_start_time} - ${match.other_shift_end_time}</p>
            <p style="margin: 0;"><strong>Location:</strong> ${match.other_shift_truck}</p>
            <p style="margin: 0;"><strong>Role:</strong> ${match.other_shift_colleague_type}</p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 15px;">
          <a href="${Deno.env.get('APP_URL') || 'https://shiftflex-web.vercel.app'}/swaps/matched" 
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
  
  // Send email using the existing sendEmail function
  const emailData = {
    to: toEmail,
    subject: `You have ${matches.length} pending shift ${matches.length === 1 ? 'swap' : 'swaps'} available`,
    html: emailHtml
  };
  
  // Use service role client to call the send_email function
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { error } = await supabase.functions.invoke('send_email', {
    body: emailData
  });
  
  if (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

/**
 * Send a test email to a specific user with their matches
 */
async function sendTestMatchEmail(userId: string): Promise<void> {
  console.log(`Sending test email for user: ${userId}`);
  
  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get the user's information
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  
  if (userError || !userData?.user) {
    throw new Error(`Error fetching user data for test: ${userError?.message || "User not found"}`);
  }
  
  const email = userData.user.email;
  
  if (!email) {
    throw new Error("Test user has no email address");
  }
  
  // Get user profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (profileError || !profile) {
    throw new Error(`Error fetching profile data for test: ${profileError?.message || "Profile not found"}`);
  }
  
  const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "User";
  
  // Get all pending matches for this user
  const { data: userRequests } = await supabase
    .from('shift_swap_requests')
    .select('id')
    .eq('requester_id', userId);
    
  if (!userRequests || userRequests.length === 0) {
    // No requests found, send a test email anyway
    console.log("No requests found for test user, sending sample match email");
    
    // Create a sample match for testing
    const testMatch: SwapMatch = {
      match_id: "test-match-id",
      match_status: "pending",
      created_at: new Date().toISOString(),
      match_date: new Date().toISOString().split('T')[0],
      my_request_id: "test-request-id",
      other_request_id: "test-other-request-id",
      my_shift_id: "test-shift-id",
      my_shift_date: "2025-05-15",
      my_shift_start_time: "08:00:00",
      my_shift_end_time: "16:00:00",
      my_shift_truck: "Example Location",
      my_shift_colleague_type: "Qualified",
      my_employee_id: profile.employee_id || "12345",
      other_shift_id: "test-other-shift-id",
      other_shift_date: "2025-05-20",
      other_shift_start_time: "08:00:00",
      other_shift_end_time: "16:00:00",
      other_shift_truck: "Other Location",
      other_shift_colleague_type: "Qualified",
      other_employee_id: "67890",
      other_user_id: "test-other-user-id",
      other_user_name: "Test Colleague",
      user_id: userId
    };
    
    await sendMatchNotificationEmail(email, userName, [testMatch]);
    console.log(`Sent test email to ${email} with sample match data`);
    return;
  }
  
  const requestIds = userRequests.map(req => req.id);
  
  // Find matches for these requests
  const { data: matches, error: matchesError } = await supabase
    .from('shift_swap_potential_matches')
    .select('*')
    .or(`requester_request_id.in.(${requestIds.join(',')}),acceptor_request_id.in.(${requestIds.join(',')})`)
    .eq('status', 'pending');
    
  if (matchesError) {
    throw new Error(`Error fetching matches for test: ${matchesError.message}`);
  }
  
  if (!matches || matches.length === 0) {
    // No matches found, send a test email with sample data
    console.log("No matches found for test user, sending sample match email");
    
    // Create a sample match for testing
    const testMatch: SwapMatch = {
      match_id: "test-match-id",
      match_status: "pending",
      created_at: new Date().toISOString(),
      match_date: new Date().toISOString().split('T')[0],
      my_request_id: "test-request-id",
      other_request_id: "test-other-request-id",
      my_shift_id: "test-shift-id",
      my_shift_date: "2025-05-15",
      my_shift_start_time: "08:00:00",
      my_shift_end_time: "16:00:00",
      my_shift_truck: "Example Location",
      my_shift_colleague_type: "Qualified",
      my_employee_id: profile.employee_id || "12345",
      other_shift_id: "test-other-shift-id",
      other_shift_date: "2025-05-20",
      other_shift_start_time: "08:00:00",
      other_shift_end_time: "16:00:00",
      other_shift_truck: "Other Location",
      other_shift_colleague_type: "Qualified",
      other_employee_id: "67890",
      other_user_id: "test-other-user-id",
      other_user_name: "Test Colleague",
      user_id: userId
    };
    
    await sendMatchNotificationEmail(email, userName, [testMatch]);
    console.log(`Sent test email to ${email} with sample match data`);
    return;
  }
  
  console.log(`Found ${matches.length} matches for test user, preparing real match data`);
  
  // Process each match to collect data
  const formattedMatches: SwapMatch[] = [];
  
  for (const match of matches) {
    try {
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
        console.log(`Skipping test match ${match.id} - missing request data`);
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
        console.log(`Skipping test match ${match.id} - missing shift data`);
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
        console.log(`Skipping test match ${match.id} - missing profile data`);
        continue;
      }
      
      // Format the match based on whether the test user is the requester or acceptor
      const isRequester = requesterRequest.requester_id === userId;
      
      const formattedMatch: SwapMatch = {
        match_id: match.id,
        match_status: match.status,
        created_at: match.created_at,
        match_date: match.match_date,
        my_request_id: isRequester ? requesterRequest.id : acceptorRequest.id,
        other_request_id: isRequester ? acceptorRequest.id : requesterRequest.id,
        my_shift_id: isRequester ? requesterShift.id : acceptorShift.id,
        my_shift_date: isRequester ? requesterShift.date : acceptorShift.date,
        my_shift_start_time: isRequester ? requesterShift.start_time : acceptorShift.start_time,
        my_shift_end_time: isRequester ? requesterShift.end_time : acceptorShift.end_time,
        my_shift_truck: isRequester ? (requesterShift.truck_name || "No truck assigned") : (acceptorShift.truck_name || "No truck assigned"),
        my_shift_colleague_type: isRequester ? (requesterShift.colleague_type || "Unknown") : (acceptorShift.colleague_type || "Unknown"),
        my_employee_id: isRequester ? (requesterProfile.employee_id || "Not specified") : (acceptorProfile.employee_id || "Not specified"),
        other_shift_id: isRequester ? acceptorShift.id : requesterShift.id,
        other_shift_date: isRequester ? acceptorShift.date : requesterShift.date,
        other_shift_start_time: isRequester ? acceptorShift.start_time : requesterShift.start_time,
        other_shift_end_time: isRequester ? acceptorShift.end_time : requesterShift.end_time,
        other_shift_truck: isRequester ? (acceptorShift.truck_name || "No truck assigned") : (requesterShift.truck_name || "No truck assigned"),
        other_shift_colleague_type: isRequester ? (acceptorShift.colleague_type || "Unknown") : (requesterShift.colleague_type || "Unknown"),
        other_employee_id: isRequester ? (acceptorProfile.employee_id || "Not specified") : (requesterProfile.employee_id || "Not specified"),
        other_user_id: isRequester ? acceptorProfile.id : requesterProfile.id,
        other_user_name: isRequester 
          ? `${acceptorProfile.first_name || ''} ${acceptorProfile.last_name || ''}`.trim() || "Unknown User" 
          : `${requesterProfile.first_name || ''} ${requesterProfile.last_name || ''}`.trim() || "Unknown User",
        user_id: userId
      };
      
      formattedMatches.push(formattedMatch);
    } catch (error) {
      console.error(`Error processing test match ${match.id}:`, error);
      // Continue to next match
    }
  }
  
  if (formattedMatches.length > 0) {
    await sendMatchNotificationEmail(email, userName, formattedMatches);
    console.log(`Sent test email to ${email} with ${formattedMatches.length} real matches`);
  } else {
    // No matches could be processed, send test email with sample data
    console.log("No valid matches could be processed for test user, sending sample match email");
    
    // Create a sample match for testing
    const testMatch: SwapMatch = {
      match_id: "test-match-id",
      match_status: "pending",
      created_at: new Date().toISOString(),
      match_date: new Date().toISOString().split('T')[0],
      my_request_id: "test-request-id",
      other_request_id: "test-other-request-id",
      my_shift_id: "test-shift-id",
      my_shift_date: "2025-05-15",
      my_shift_start_time: "08:00:00",
      my_shift_end_time: "16:00:00",
      my_shift_truck: "Example Location",
      my_shift_colleague_type: "Qualified",
      my_employee_id: profile.employee_id || "12345",
      other_shift_id: "test-other-shift-id",
      other_shift_date: "2025-05-20",
      other_shift_start_time: "08:00:00",
      other_shift_end_time: "16:00:00",
      other_shift_truck: "Other Location",
      other_shift_colleague_type: "Qualified",
      other_employee_id: "67890",
      other_user_id: "test-other-user-id",
      other_user_name: "Test Colleague",
      user_id: userId
    };
    
    await sendMatchNotificationEmail(email, userName, [testMatch]);
    console.log(`Sent test email to ${email} with sample match data`);
  }
}
