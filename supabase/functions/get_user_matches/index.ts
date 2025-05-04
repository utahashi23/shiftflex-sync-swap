
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body and parse any options
    const { 
      user_id, 
      verbose = false, 
      specific_check = false, 
      force_check = false,
      user_perspective_only = true,
      user_initiator_only = true
    } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing request for user_id: ${user_id}, verbose: ${verbose}, force_check: ${force_check}, user_perspective_only: ${user_perspective_only}, user_initiator_only: ${user_initiator_only}`);

    // Create service client to bypass RLS
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. Get the user's pending requests
    const { data: userRequests, error: requestsError } = await serviceClient
      .from('shift_swap_requests')
      .select('*')
      .eq('requester_id', user_id)
      .eq('status', 'pending');
      
    if (requestsError) {
      console.error('Error fetching user requests:', requestsError);
      throw requestsError;
    }
    
    if (!userRequests || userRequests.length === 0) {
      console.log("No pending requests found for this user");
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    console.log(`Found ${userRequests.length} pending requests for user ${user_id}`);
    
    // Get shift IDs to fetch shift details
    const shiftIds = userRequests.map(req => req.requester_shift_id).filter(Boolean);
    
    // 2. Get all shifts for user requests
    const { data: userShifts, error: shiftsError } = await serviceClient
      .from('shifts')
      .select('*')
      .in('id', shiftIds);
      
    if (shiftsError) {
      console.error('Error fetching user shifts:', shiftsError);
      throw shiftsError;
    }
    
    // Create map of request ID to shift date for quick lookup
    const requestShiftDateMap = {};
    userRequests.forEach(req => {
      const shift = userShifts.find(s => s.id === req.requester_shift_id);
      if (shift) {
        requestShiftDateMap[req.id] = shift.date;
      }
    });
    
    // 3. Get preferred dates for user requests
    const { data: preferredDates, error: datesError } = await serviceClient
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', userRequests.map(r => r.id));
      
    if (datesError) {
      console.error('Error fetching preferred dates:', datesError);
      throw datesError;
    }
    
    // Group preferred dates by request
    const preferredDatesByRequest = {};
    preferredDates.forEach(pd => {
      if (!preferredDatesByRequest[pd.request_id]) {
        preferredDatesByRequest[pd.request_id] = [];
      }
      preferredDatesByRequest[pd.request_id].push(pd.date);
    });
    
    // 4. Get all other users' pending requests
    const { data: otherRequests, error: otherRequestsError } = await serviceClient
      .from('shift_swap_requests')
      .select('*')
      .neq('requester_id', user_id)
      .eq('status', 'pending');
      
    if (otherRequestsError) {
      console.error('Error fetching other requests:', otherRequestsError);
      throw otherRequestsError;
    }
    
    if (!otherRequests || otherRequests.length === 0) {
      console.log("No pending requests found from other users");
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    console.log(`Found ${otherRequests.length} pending requests from other users`);
    
    // Get other shifts
    const otherShiftIds = otherRequests.map(req => req.requester_shift_id).filter(Boolean);
    
    // 5. Get shifts for other requests
    const { data: otherShifts, error: otherShiftsError } = await serviceClient
      .from('shifts')
      .select('*')
      .in('id', otherShiftIds);
      
    if (otherShiftsError) {
      console.error('Error fetching other shifts:', otherShiftsError);
      throw otherShiftsError;
    }
    
    // Create map for other requests' shift dates
    const otherRequestShiftDateMap = {};
    otherRequests.forEach(req => {
      const shift = otherShifts.find(s => s.id === req.requester_shift_id);
      if (shift) {
        otherRequestShiftDateMap[req.id] = shift.date;
      }
    });
    
    // 6. Get preferred dates for other requests
    const { data: otherPreferredDates, error: otherDatesError } = await serviceClient
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', otherRequests.map(r => r.id));
      
    if (otherDatesError) {
      console.error('Error fetching other preferred dates:', otherDatesError);
      throw otherDatesError;
    }
    
    // Group other preferred dates by request
    const otherPreferredDatesByRequest = {};
    otherPreferredDates.forEach(pd => {
      if (!otherPreferredDatesByRequest[pd.request_id]) {
        otherPreferredDatesByRequest[pd.request_id] = [];
      }
      otherPreferredDatesByRequest[pd.request_id].push(pd.date);
    });

    // Now implement Ruby-like matching logic
    const matches = [];
    
    // For each of the user's requests
    for (const userRequest of userRequests) {
      const userShiftDate = requestShiftDateMap[userRequest.id];
      if (!userShiftDate) continue;
      
      const userPreferredDates = preferredDatesByRequest[userRequest.id] || [];
      
      // For each other request
      for (const otherRequest of otherRequests) {
        // Avoid comparing with self or already processed pairs
        if (userRequest.id === otherRequest.id || 
            userRequest.requester_id === otherRequest.requester_id) {
          continue;
        }
        
        // Get the other request's shift date
        const otherShiftDate = otherRequestShiftDateMap[otherRequest.id];
        if (!otherShiftDate) continue;
        
        // Get the other request's preferred dates
        const otherPreferredDates = otherPreferredDatesByRequest[otherRequest.id] || [];
        
        console.log(`Checking match between request ${userRequest.id} and ${otherRequest.id}`);
        console.log(`User shift date: ${userShiftDate}, preferred dates: ${JSON.stringify(userPreferredDates)}`);
        console.log(`Other shift date: ${otherShiftDate}, preferred dates: ${JSON.stringify(otherPreferredDates)}`);
        
        // True reciprocal matching based on the Ruby logic:
        // 1. User wants other's shift date
        // 2. Other wants user's shift date
        const userWantsOtherDate = userPreferredDates.includes(otherShiftDate);
        const otherWantsUserDate = otherPreferredDates.includes(userShiftDate);

        if (userWantsOtherDate && otherWantsUserDate) {
          console.log(`✓ MATCH FOUND between ${userRequest.id} and ${otherRequest.id}`);
          
          // Check if this match already exists in potential_matches table
          const { data: existingMatch, error: matchCheckError } = await serviceClient
            .from('shift_swap_potential_matches')
            .select('id')
            .or(`and(requester_request_id.eq.${userRequest.id},acceptor_request_id.eq.${otherRequest.id}),and(requester_request_id.eq.${otherRequest.id},acceptor_request_id.eq.${userRequest.id})`)
            .limit(1);
            
          if (!matchCheckError && (!existingMatch || existingMatch.length === 0)) {
            // Create new match - ALWAYS with user as requester for consistent UI
            const { data: newMatch, error: createMatchError } = await serviceClient
              .from('shift_swap_potential_matches')
              .insert({
                requester_request_id: userRequest.id,
                acceptor_request_id: otherRequest.id,
                requester_shift_id: userRequest.requester_shift_id,
                acceptor_shift_id: otherRequest.requester_shift_id,
                match_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            if (createMatchError) {
              console.error('Error creating match:', createMatchError);
            } else {
              console.log('New match created:', newMatch);
              matches.push(newMatch);
            }
          } else if (existingMatch && existingMatch.length > 0) {
            console.log('Match already exists:', existingMatch[0]);
            matches.push(existingMatch[0]);
          }
        } else {
          const reasons = [];
          if (!userWantsOtherDate) reasons.push("User doesn't want other's date");
          if (!otherWantsUserDate) reasons.push("Other doesn't want user's date");
          console.log(`✗ NO MATCH between ${userRequest.id} and ${otherRequest.id}: ${reasons.join(', ')}`);
        }
      }
    }
    
    // If we have matches, get detailed information
    if (matches.length > 0) {
      const formattedMatches = await getMatchDetails(serviceClient, matches, user_id);
      return new Response(
        JSON.stringify(formattedMatches),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Return empty array if no matches
    return new Response(
      JSON.stringify([]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

// Helper function to get detailed match info using service role client
async function getMatchDetails(serviceClient, matches, userId) {
  const results = [];
  
  for (const match of matches) {
    try {
      // Get the requester request (which should always be the user's request)
      const { data: reqData, error: reqError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.requester_request_id)
        .single();
        
      if (reqError || !reqData) {
        console.error('Error fetching requester request:', reqError);
        continue;
      }
      
      // Get the acceptor request
      const { data: acceptorData, error: acceptorError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.acceptor_request_id)
        .single();
        
      if (acceptorError || !acceptorData) {
        console.error('Error fetching acceptor request:', acceptorError);
        continue;
      }
      
      // Get shift details for both requests
      const { data: shifts, error: shiftsError } = await serviceClient
        .from('shifts')
        .select('*')
        .in('id', [reqData.requester_shift_id, acceptorData.requester_shift_id]);
        
      if (shiftsError || !shifts || shifts.length < 2) {
        console.log('Could not fetch shift details, skipping');
        continue;
      }
      
      // Match shifts to requests
      const userShift = shifts.find(s => s.id === reqData.requester_shift_id);
      const otherShift = shifts.find(s => s.id === acceptorData.requester_shift_id);
      
      if (!userShift || !otherShift) {
        console.log('Could not match shifts to requests, skipping');
        continue;
      }
      
      // Get other user's profile
      const { data: otherProfile, error: profileError } = await serviceClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', acceptorData.requester_id)
        .single();
      
      // Format the match data - here "my" always refers to the current user
      results.push({
        match_id: match.id,
        match_status: match.status || 'pending',
        created_at: match.created_at,
        match_date: match.match_date,
        my_request_id: reqData.id,
        other_request_id: acceptorData.id,
        my_shift_id: userShift.id,
        my_shift_date: userShift.date,
        my_shift_start_time: userShift.start_time,
        my_shift_end_time: userShift.end_time,
        my_shift_truck: userShift.truck_name || null,
        other_shift_id: otherShift.id,
        other_shift_date: otherShift.date,
        other_shift_start_time: otherShift.start_time,
        other_shift_end_time: otherShift.end_time,
        other_shift_truck: otherShift.truck_name || null,
        other_user_id: acceptorData.requester_id,
        other_user_name: otherProfile ? 
          `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() : 
          'Unknown User'
      });
    } catch (error) {
      console.error(`Error processing match ${match.id}:`, error);
    }
  }
  
  return results;
}
