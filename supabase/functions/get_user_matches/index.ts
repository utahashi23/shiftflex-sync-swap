import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  user_id: string;
  user_perspective_only?: boolean;
  user_initiator_only?: boolean;
  bypass_rls?: boolean;
  verbose?: boolean;
  force_check?: boolean;
  include_colleague_types?: boolean;
  include_shift_data?: boolean;
  has_active_requests?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request data
    const requestData: RequestBody = await req.json();
    const { 
      user_id,
      user_perspective_only = true,
      user_initiator_only = true,
      verbose = false,
      force_check = false,
      include_colleague_types = true,
      include_shift_data = true
    } = requestData;

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // First check if the user has any pending requests
    const { data: userRequests, error: requestsError } = await supabaseAdmin
      .from('shift_swap_requests')
      .select('id, requester_id, requester_shift_id, status')
      .eq('requester_id', user_id)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('Error fetching user requests:', requestsError);
      return new Response(
        JSON.stringify({ success: false, error: requestsError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Using service role to fetch user's requests...`);
    console.log(`Found ${userRequests?.length || 0} pending requests for user ${user_id}`);

    // Fetch all potential matches for this user
    let query = supabaseAdmin
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        match_date,
        created_at,
        requester_request_id,
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id,
        requester_has_accepted,
        acceptor_has_accepted,
        requester:requester_request_id(requester_id, status),
        acceptor:acceptor_request_id(requester_id, status)
      `)
      .neq('status', 'cancelled');
      
    // Apply filters using the proper Supabase Filter method
    if (user_initiator_only) {
      // Only find matches where the user is the requester
      query = query.filter('requester.requester_id', 'eq', user_id);
    } else {
      // Find matches where the user is either the requester or the acceptor
      // We need to create a condition with an OR statement
      query = query.or('requester.requester_id.eq.' + user_id + ',acceptor.requester_id.eq.' + user_id);
    }
    
    const { data: potentialMatches, error: matchesError } = await query;

    if (matchesError) {
      console.error('Error fetching potential matches:', matchesError);
      return new Response(
        JSON.stringify({ success: false, error: matchesError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!potentialMatches || potentialMatches.length === 0) {
      console.log(`No potential matches found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: true, matches: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Found ${potentialMatches.length} potential matches for user ${user_id}`);

    // Collect all shift IDs we need to fetch
    const shiftIds = [];
    for (const match of potentialMatches) {
      shiftIds.push(match.requester_shift_id);
      shiftIds.push(match.acceptor_shift_id);
    }

    // Fetch all shift details
    const { data: shifts, error: shiftsError } = await supabaseAdmin
      .from('shifts')
      .select(`
        id, 
        user_id, 
        date, 
        start_time, 
        end_time, 
        truck_name, 
        status,
        colleague_type
      `)
      .in('id', shiftIds);

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      return new Response(
        JSON.stringify({ success: false, error: shiftsError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a map of shifts for easy lookup
    const shiftMap = {};
    for (const shift of shifts) {
      shiftMap[shift.id] = shift;
    }

    // Collect user IDs to fetch profiles
    const userIds = new Set();
    for (const match of potentialMatches) {
      if (match.requester?.requester_id) {
        userIds.add(match.requester.requester_id);
      }
      if (match.acceptor?.requester_id) {
        userIds.add(match.acceptor.requester_id);
      }
    }

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, employee_id')
      .in('id', Array.from(userIds));

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ success: false, error: profilesError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a map of profiles for easy lookup
    const profileMap = {};
    for (const profile of profiles) {
      profileMap[profile.id] = profile;
    }

    // Format the matches for the API response
    const formattedMatches = potentialMatches.map(match => {
      // Determine which user in the match is the current user
      const isRequester = match.requester?.requester_id === user_id;
      
      // Get the shift IDs for my shift and the other user's shift
      const myShiftId = isRequester ? match.requester_shift_id : match.acceptor_shift_id;
      const otherShiftId = isRequester ? match.acceptor_shift_id : match.requester_shift_id;
      
      // Get the shift data
      const myShift = shiftMap[myShiftId];
      const otherShift = shiftMap[otherShiftId];
      
      // Get the other user's ID and profile
      const otherUserId = isRequester 
        ? match.acceptor?.requester_id 
        : match.requester?.requester_id;
      
      const otherUserProfile = profileMap[otherUserId];
      
      // Determine the match status from the user's perspective
      const isPending = match.status === 'pending';
      const isAccepted = match.status === 'accepted';
      const isCompleted = match.status === 'completed';
      
      // Check which user has accepted the match
      const iHaveAccepted = isRequester 
        ? match.requester_has_accepted 
        : match.acceptor_has_accepted;
      
      const theyHaveAccepted = isRequester 
        ? match.acceptor_has_accepted 
        : match.requester_has_accepted;
      
      // Determine display status
      let displayStatus = match.status;
      if (isPending) {
        if (iHaveAccepted && !theyHaveAccepted) {
          displayStatus = 'accepted'; // I've accepted, waiting for them
        } else if (!iHaveAccepted && theyHaveAccepted) {
          displayStatus = 'other_accepted'; // They've accepted, waiting for me
        }
      }
      
      // Format the match data
      return {
        match_id: match.id,
        match_status: displayStatus,
        created_at: match.created_at,
        match_date: match.match_date,
        
        // My side of the match
        my_user_id: user_id,
        my_request_id: isRequester ? match.requester_request_id : match.acceptor_request_id,
        my_shift_id: myShiftId,
        my_shift_date: myShift?.date,
        my_shift_start_time: myShift?.start_time,
        my_shift_end_time: myShift?.end_time,
        my_shift_truck: myShift?.truck_name,
        my_shift_colleague_type: myShift?.colleague_type,
        
        // Other user's side
        other_user_id: otherUserId,
        other_user_name: otherUserProfile 
          ? `${otherUserProfile.first_name || ''} ${otherUserProfile.last_name || ''}`.trim()
          : 'Unknown User',
        other_user_employee_id: otherUserProfile?.employee_id,
        other_request_id: isRequester ? match.acceptor_request_id : match.requester_request_id,
        other_shift_id: otherShiftId,
        other_shift_date: otherShift?.date,
        other_shift_start_time: otherShift?.start_time,
        other_shift_end_time: otherShift?.end_time,
        other_shift_truck: otherShift?.truck_name,
        other_shift_colleague_type: otherShift?.colleague_type,
        
        // Acceptance tracking
        requester_has_accepted: match.requester_has_accepted,
        acceptor_has_accepted: match.acceptor_has_accepted,
        
        // My role in this match
        is_requester: isRequester
      };
    });

    // Return the formatted matches
    return new Response(
      JSON.stringify({ success: true, matches: formattedMatches }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error.message);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
