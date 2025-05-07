
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { user_id, user_perspective_only = true, user_initiator_only = true, include_colleague_types = false, include_shift_data = true, include_employee_ids = false } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({
          error: "Missing user_id parameter",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Processing match request for user: ${user_id}`);
    console.log(`Options: perspective_only=${user_perspective_only}, initiator_only=${user_initiator_only}, include_colleague_types=${include_colleague_types}, include_shift_data=${include_shift_data}, include_employee_ids=${include_employee_ids}`);

    // Query potential matches
    const { data: matchesData, error: matchesError } = await supabase
      .from("shift_swap_potential_matches")
      .select(`
        id as match_id,
        status as match_status,
        created_at,
        match_date,
        requester_request_id as my_request_id,
        acceptor_request_id as other_request_id,
        requester_shift_id as my_shift_id,
        acceptor_shift_id as other_shift_id
      `)
      .or(`requester_request_id.in.(select id from shift_swap_requests where requester_id='${user_id}'),acceptor_request_id.in.(select id from shift_swap_requests where requester_id='${user_id}')`)
      .order("created_at", { ascending: false });
    
    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      throw matchesError;
    }
    
    if (!matchesData || matchesData.length === 0) {
      return new Response(
        JSON.stringify([]),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Found ${matchesData.length} potential matches`);

    // Construct a batch request to get the shift data for all matches
    const shiftIds = new Set();
    const requestIds = new Set();
    const userIds = new Set();
    
    // Collect all shift IDs and request IDs for batch queries
    matchesData.forEach(match => {
      if (match.my_shift_id) shiftIds.add(match.my_shift_id);
      if (match.other_shift_id) shiftIds.add(match.other_shift_id);
      if (match.my_request_id) requestIds.add(match.my_request_id);
      if (match.other_request_id) requestIds.add(match.other_request_id);
    });
    
    console.log(`Collecting data for ${shiftIds.size} shifts and ${requestIds.size} requests`);
    
    // Fetch shift data
    const { data: shiftsData, error: shiftsError } = await supabase
      .from("shifts")
      .select("id, date, start_time, end_time, truck_name, user_id, colleague_type")
      .in("id", Array.from(shiftIds));
    
    if (shiftsError) {
      console.error("Error fetching shifts:", shiftsError);
      throw shiftsError;
    }
    
    // Fetch request data to get user IDs
    const { data: requestsData, error: requestsError } = await supabase
      .from("shift_swap_requests")
      .select("id, requester_id, requester_shift_id")
      .in("id", Array.from(requestIds));
    
    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      throw requestsError;
    }
    
    // Create maps for quick lookups
    const shiftsMap = {};
    shiftsData.forEach(shift => {
      shiftsMap[shift.id] = shift;
      if (shift.user_id) userIds.add(shift.user_id);
    });
    
    const requestsMap = {};
    requestsData.forEach(request => {
      requestsMap[request.id] = request;
      if (request.requester_id) userIds.add(request.requester_id);
    });
    
    // Fetch profiles for user names and employee IDs
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, employee_id")
      .in("id", Array.from(userIds));
    
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }
    
    // Create user map for quick lookup
    const userMap = {};
    profilesData.forEach(profile => {
      userMap[profile.id] = profile;
    });
    
    // Normalize the data
    const normalized = matchesData.map(match => {
      const myShift = shiftsMap[match.my_shift_id] || {};
      const otherShift = shiftsMap[match.other_shift_id] || {};
      
      const myRequest = requestsMap[match.my_request_id] || {};
      const otherRequest = requestsMap[match.other_request_id] || {};
      
      // Get user details
      const otherUserId = otherRequest.requester_id || null;
      const otherUserProfile = userMap[otherUserId] || {};
      const myUserProfile = userMap[myRequest.requester_id] || {};
      
      const otherUserName = otherUserProfile 
        ? `${otherUserProfile.first_name || ''} ${otherUserProfile.last_name || ''}`.trim() 
        : null;
      
      const result = {
        match_id: match.match_id,
        match_status: match.match_status,
        created_at: match.created_at,
        match_date: match.match_date,
        my_request_id: match.my_request_id,
        other_request_id: match.other_request_id,
        my_shift_id: match.my_shift_id,
        other_shift_id: match.other_shift_id,
        other_user_id: otherUserId,
        other_user_name: otherUserName,
      };
      
      // Include shift data if requested
      if (include_shift_data) {
        result.my_shift_date = myShift.date || null;
        result.my_shift_start_time = myShift.start_time || null;
        result.my_shift_end_time = myShift.end_time || null;
        result.my_shift_truck = myShift.truck_name || null;
        
        result.other_shift_date = otherShift.date || null;
        result.other_shift_start_time = otherShift.start_time || null;
        result.other_shift_end_time = otherShift.end_time || null;
        result.other_shift_truck = otherShift.truck_name || null;
      }
      
      // Include colleague types if requested
      if (include_colleague_types) {
        result.my_shift_colleague_type = myShift.colleague_type || null;
        result.other_shift_colleague_type = otherShift.colleague_type || null;
      }
      
      // Include employee IDs if requested
      if (include_employee_ids) {
        result.my_shift_employee_id = myUserProfile.employee_id || null;
        result.other_shift_employee_id = otherUserProfile.employee_id || null;
      }
      
      return result;
    });
    
    console.log(`Returning ${normalized.length} formatted matches`);
    
    return new Response(
      JSON.stringify(normalized),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get_user_matches:", error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
