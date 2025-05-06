
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
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { 
      user_id, 
      verbose = false, 
      specific_check = false, 
      force_check = false,
      user_perspective_only = true,
      user_initiator_only = true,
      include_colleague_types = true, 
      include_shift_data = true
    } = await req.json()
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing request for user_id: ${user_id}, verbose: ${verbose}, force_check: ${force_check}, user_perspective_only: ${user_perspective_only}, user_initiator_only: ${user_initiator_only}, include_colleague_types: ${include_colleague_types}`);

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Use the service role to fetch requests directly without RLS issues
    try {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      console.log("Using service role to fetch user's requests...");
      
      // Get user's pending requests
      const { data: userRequests, error: userRequestsError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .eq('requester_id', user_id)
        .eq('status', 'pending');
      
      if (userRequestsError) {
        console.error('Error fetching user requests:', userRequestsError);
      } else {
        console.log(`Found ${userRequests?.length || 0} pending requests for user ${user_id}`);
        
        if (userRequests && userRequests.length > 0) {
          // Get all other users' pending requests
          const { data: otherRequests, error: otherRequestsError } = await serviceClient
            .from('shift_swap_requests')
            .select('*')
            .neq('requester_id', user_id)
            .eq('status', 'pending');
          
          if (otherRequestsError) {
            console.error('Error fetching other users\' requests:', otherRequestsError);
          } else {
            console.log(`Found ${otherRequests?.length || 0} pending requests from other users`);
            
            if (otherRequests && otherRequests.length > 0) {
              // Get all relevant shift IDs
              const shiftIds = [
                ...userRequests.map(r => r.requester_shift_id),
                ...otherRequests.map(r => r.requester_shift_id)
              ].filter(Boolean);
              
              // Get shift data - EXPLICITLY SELECT colleague_type
              const { data: shifts, error: shiftsError } = await serviceClient
                .from('shifts')
                .select('id, date, start_time, end_time, truck_name, colleague_type, user_id')
                .in('id', shiftIds);
              
              if (shiftsError) {
                console.error('Error fetching shifts:', shiftsError);
              } else {
                console.log(`Fetched ${shifts?.length || 0} shifts data`);
                
                // Log first shift to verify colleague_type is included
                if (shifts && shifts.length > 0) {
                  console.log('First shift from database:', shifts[0]);
                }
                
                // Create a map for quick shift lookups
                const shiftsMap = {};
                shifts?.forEach(shift => {
                  shiftsMap[shift.id] = shift;
                });
                
                // Get all request IDs
                const allRequestIds = [
                  ...userRequests.map(r => r.id),
                  ...otherRequests.map(r => r.id)
                ];
                
                // Get preferred dates for all requests
                const { data: prefDates, error: prefDatesError } = await serviceClient
                  .from('shift_swap_preferred_dates')
                  .select('*')
                  .in('request_id', allRequestIds);
                
                if (prefDatesError) {
                  console.error('Error fetching preferred dates:', prefDatesError);
                } else {
                  console.log(`Fetched ${prefDates?.length || 0} preferred dates`);
                  
                  // Group preferred dates by request
                  const prefDatesByRequest = {};
                  prefDates?.forEach(date => {
                    if (!prefDatesByRequest[date.request_id]) {
                      prefDatesByRequest[date.request_id] = [];
                    }
                    prefDatesByRequest[date.request_id].push(date.date);
                  });
                  
                  // Find potential matches
                  const matches = [];
                  
                  // For each user request, check against other requests
                  for (const userRequest of userRequests) {
                    const userShift = shiftsMap[userRequest.requester_shift_id];
                    
                    if (!userShift) {
                      console.log(`Missing shift data for user request ${userRequest.id}`);
                      continue;
                    }
                    
                    const userPreferredDates = prefDatesByRequest[userRequest.id] || [];
                    console.log(`User request ${userRequest.id} has ${userPreferredDates.length} preferred dates`);
                    
                    for (const otherRequest of otherRequests) {
                      const otherShift = shiftsMap[otherRequest.requester_shift_id];
                      
                      if (!otherShift) {
                        console.log(`Missing shift data for other request ${otherRequest.id}`);
                        continue;
                      }
                      
                      const otherPreferredDates = prefDatesByRequest[otherRequest.id] || [];
                      
                      // Check if user wants other shift date
                      const userWantsOtherDate = userPreferredDates.includes(otherShift.date);
                      
                      // Check if other user wants user's shift date
                      const otherWantsUserDate = otherPreferredDates.includes(userShift.date);
                      
                      if (userWantsOtherDate && otherWantsUserDate) {
                        console.log(`MATCH FOUND between ${userRequest.id} and ${otherRequest.id}`);
                        
                        // Check if match already exists
                        const { data: existingMatch, error: matchError } = await serviceClient
                          .from('shift_swap_potential_matches')
                          .select('*')
                          .or(`and(requester_request_id.eq.${userRequest.id},acceptor_request_id.eq.${otherRequest.id}),and(requester_request_id.eq.${otherRequest.id},acceptor_request_id.eq.${userRequest.id})`)
                          .limit(1);
                        
                        if (matchError) {
                          console.error('Error checking for existing match:', matchError);
                        } else if (!existingMatch || existingMatch.length === 0) {
                          // Create new match
                          const { data: newMatch, error: createError } = await serviceClient
                            .from('shift_swap_potential_matches')
                            .insert({
                              requester_request_id: userRequest.id,
                              acceptor_request_id: otherRequest.id,
                              requester_shift_id: userRequest.requester_shift_id,
                              acceptor_shift_id: otherRequest.requester_shift_id,
                              match_date: new Date().toISOString().split('T')[0]
                            })
                            .select('*')
                            .single();
                          
                          if (createError) {
                            console.error('Error creating match:', createError);
                          } else {
                            console.log('Match created:', newMatch);
                            matches.push(newMatch);
                          }
                        } else {
                          console.log('Match already exists:', existingMatch[0]);
                          matches.push(existingMatch[0]);
                        }
                      }
                    }
                  }
                  
                  // Get all potential matches for this user
                  const { data: userMatches, error: userMatchesError } = await serviceClient
                    .from('shift_swap_potential_matches')
                    .select('*')
                    .or(`requester_request_id.in.(${userRequests.map(r => r.id).join(',')}),acceptor_request_id.in.(${userRequests.map(r => r.id).join(',')})`)
                    .order('created_at', { ascending: false });

                  if (userMatchesError) {
                    console.error('Error fetching user matches:', userMatchesError);
                  } else {
                    console.log(`Found ${userMatches?.length || 0} potential matches for user ${user_id}`);
                    
                    // Get data about accepted matches to know which shifts are already committed
                    const { data: acceptedMatches, error: acceptedError } = await serviceClient
                      .from('shift_swap_potential_matches')
                      .select('*')
                      .eq('status', 'accepted');
                    
                    // Create sets of shifts and requests that are in accepted matches
                    const acceptedShiftIds = new Set();
                    const acceptedRequestIds = new Set();
                    
                    if (acceptedMatches) {
                      acceptedMatches.forEach(match => {
                        acceptedShiftIds.add(match.requester_shift_id);
                        acceptedShiftIds.add(match.acceptor_shift_id);
                        acceptedRequestIds.add(match.requester_request_id);
                        acceptedRequestIds.add(match.acceptor_request_id);
                      });
                    }
                    
                    // Process user matches
                    if (userMatches) {
                      // Get user info for all matches
                      const formattedMatches = [];
                      
                      for (const match of userMatches) {
                        // Get request data for both sides of the match
                        const { data: req1Data, error: req1Error } = await serviceClient
                          .from('shift_swap_requests')
                          .select('*')
                          .eq('id', match.requester_request_id)
                          .single();
                          
                        const { data: req2Data, error: req2Error } = await serviceClient
                          .from('shift_swap_requests')
                          .select('*')
                          .eq('id', match.acceptor_request_id)
                          .single();
                        
                        if (req1Error || req2Error || !req1Data || !req2Data) {
                          console.log('Error fetching request data, skipping match');
                          continue;
                        }
                        
                        // Get shift data for both sides
                        const shift1 = shiftsMap[match.requester_shift_id];
                        const shift2 = shiftsMap[match.acceptor_shift_id];
                        
                        if (!shift1 || !shift2) {
                          console.log('Missing shift data, skipping match');
                          continue;
                        }
                        
                        // Get user profiles
                        const { data: user1Profile } = await serviceClient
                          .from('profiles')
                          .select('first_name, last_name')
                          .eq('id', req1Data.requester_id)
                          .single();
                          
                        const { data: user2Profile } = await serviceClient
                          .from('profiles')
                          .select('first_name, last_name')
                          .eq('id', req2Data.requester_id)
                          .single();
                        
                        // Determine if this match involves a shift or request that's part of another accepted match
                        // We'll mark these as "otherAccepted" if the current user isn't the one who accepted it
                        let matchStatus = match.status;
                        
                        // If the match is pending, check if its shifts/requests are part of other accepted matches
                        if (matchStatus === 'pending') {
                          const isShift1InAcceptedMatch = acceptedShiftIds.has(shift1.id);
                          const isShift2InAcceptedMatch = acceptedShiftIds.has(shift2.id);
                          const isReq1InAcceptedMatch = acceptedRequestIds.has(req1Data.id);
                          const isReq2InAcceptedMatch = acceptedRequestIds.has(req2Data.id);
                          
                          if (
                            isShift1InAcceptedMatch || isShift2InAcceptedMatch || 
                            isReq1InAcceptedMatch || isReq2InAcceptedMatch
                          ) {
                            // At least one part of this match is already accepted elsewhere
                            // This should be marked as otherAccepted for the current user
                            matchStatus = 'otherAccepted';
                            console.log(`Marking match ${match.id} as otherAccepted because a related shift or request is part of an accepted match`);
                          }
                        }
                        
                        // Determine if this is from the user's perspective
                        const isUserReq1 = req1Data.requester_id === user_id;
                        
                        // Format the match data for the frontend
                        formattedMatches.push({
                          match_id: match.id,
                          match_status: matchStatus,
                          created_at: match.created_at,
                          match_date: match.match_date,
                          my_request_id: isUserReq1 ? req1Data.id : req2Data.id,
                          other_request_id: isUserReq1 ? req2Data.id : req1Data.id,
                          my_shift_id: isUserReq1 ? shift1.id : shift2.id,
                          my_shift_date: isUserReq1 ? shift1.date : shift2.date,
                          my_shift_start_time: isUserReq1 ? shift1.start_time : shift2.start_time,
                          my_shift_end_time: isUserReq1 ? shift1.end_time : shift2.end_time,
                          my_shift_truck: isUserReq1 ? shift1.truck_name : shift2.truck_name,
                          my_shift_colleague_type: isUserReq1 ? shift1.colleague_type : shift2.colleague_type,
                          other_shift_id: isUserReq1 ? shift2.id : shift1.id,
                          other_shift_date: isUserReq1 ? shift2.date : shift1.date,
                          other_shift_start_time: isUserReq1 ? shift2.start_time : shift1.start_time,
                          other_shift_end_time: isUserReq1 ? shift2.end_time : shift1.end_time, 
                          other_shift_truck: isUserReq1 ? shift2.truck_name : shift1.truck_name,
                          other_shift_colleague_type: isUserReq1 ? shift2.colleague_type : shift1.colleague_type,
                          other_user_id: isUserReq1 ? req2Data.requester_id : req1Data.requester_id,
                          other_user_name: isUserReq1 
                            ? `${user2Profile?.first_name || ''} ${user2Profile?.last_name || ''}`.trim() 
                            : `${user1Profile?.first_name || ''} ${user1Profile?.last_name || ''}`.trim()
                        });
                      }
                      
                      console.log(`Returning ${formattedMatches.length} formatted matches`);
                      
                      // Log first match to verify colleague_type fields are included
                      if (formattedMatches.length > 0) {
                        console.log('First formatted match:', {
                          match_id: formattedMatches[0].match_id,
                          match_status: formattedMatches[0].match_status,
                          my_shift_colleague_type: formattedMatches[0].my_shift_colleague_type,
                          other_shift_colleague_type: formattedMatches[0].other_shift_colleague_type
                        });
                      }
                      
                      return new Response(
                        JSON.stringify(formattedMatches),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      // If we get here, we didn't find any matches
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (error) {
      console.error('Error processing user matches:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Helper function to get request IDs for a user using service role client
async function getUserRequestIds(serviceClient, userId) {
  const { data, error } = await serviceClient
    .from('shift_swap_requests')
    .select('id')
    .eq('requester_id', userId);
    
  if (error) {
    console.error('Error getting user request IDs:', error);
    return [];
  }
  
  return data ? data.map(r => r.id) : [];
}

// Helper function to get detailed match info using service role client
async function getMatchDetails(serviceClient, matches, userId) {
  const results = [];
  
  for (const match of matches) {
    try {
      // Get the requester request (which should always be the user's request when user_initiator_only=true)
      const { data: reqData, error: reqError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.requester_request_id)
        .single();
        
      if (reqError || !reqData) {
        console.error('Error fetching requester request:', reqError);
        continue;
      }
      
      // CRITICAL CHECK: Ensure this is the current user's request
      if (reqData.requester_id !== userId) {
        console.log(`Skipping match ${match.id} - requester is not the current user (${reqData.requester_id} vs ${userId})`);
        continue;
      }
      
      // Get the acceptor request (which should always be the other user's request)
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
      
      // Match shifts to requests - user's shift is always the requester shift
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
        match_status: match.status,
        created_at: match.created_at,
        match_date: match.match_date,
        my_request_id: reqData.id,
        other_request_id: acceptorData.id,
        my_shift_id: userShift.id,
        my_shift_date: userShift.date,
        my_shift_start_time: userShift.start_time,
        my_shift_end_time: userShift.end_time,
        my_shift_truck: userShift.truck_name || null,
        my_shift_colleague_type: userShift.colleague_type || 'Unknown',
        other_shift_id: otherShift.id,
        other_shift_date: otherShift.date,
        other_shift_start_time: otherShift.start_time,
        other_shift_end_time: otherShift.end_time,
        other_shift_truck: otherShift.truck_name || null,
        other_shift_colleague_type: otherShift.colleague_type || 'Unknown',
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

// Helper function to attempt manual matching using service role client
async function attemptManualMatching(serviceClient, userId, userInitiatorOnly = true) {
  try {
    console.log("Starting manual matching process");
    
    // Get user's requests and shifts
    const { data: userRequests, error: reqError } = await serviceClient
      .from('shift_swap_requests')
      .select('*')
      .eq('requester_id', userId)
      .eq('status', 'pending');
      
    if (reqError || !userRequests || userRequests.length === 0) {
      console.log("No pending requests found for this user");
      return [];
    }
    
    console.log(`User has ${userRequests.length} pending requests`);
    
    // Get other users' requests
    const { data: otherRequests, error: otherReqError } = await serviceClient
      .from('shift_swap_requests')
      .select('*')
      .neq('requester_id', userId)
      .eq('status', 'pending');
      
    if (otherReqError || !otherRequests || otherRequests.length === 0) {
      console.log("No pending requests found from other users");
      return [];
    }
    
    console.log(`Found ${otherRequests.length} pending requests from other users`);
    
    // Get shifts for all requests
    const allShiftIds = [...userRequests, ...otherRequests].map(r => r.requester_shift_id).filter(Boolean);
    const { data: allShifts, error: shiftsError } = await serviceClient
      .from('shifts')
      .select('*')
      .in('id', allShiftIds);
      
    if (shiftsError || !allShifts) {
      console.log("Error fetching shifts");
      return [];
    }
    
    console.log(`Fetched ${allShifts.length} shifts for matching`);
    
    // Get preferred dates for all requests
    const allRequestIds = [...userRequests, ...otherRequests].map(r => r.id).filter(Boolean);
    const { data: allPreferredDates, error: datesError } = await serviceClient
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', allRequestIds);
      
    if (datesError) {
      console.log("Error fetching preferred dates");
      return [];
    }
    
    console.log(`Fetched ${allPreferredDates?.length || 0} preferred dates`);
    
    // Get data about accepted matches to know which shifts are already committed
    const { data: acceptedMatches, error: acceptedError } = await serviceClient
      .from('shift_swap_potential_matches')
      .select('*')
      .eq('status', 'accepted');
                    
    // Create sets of shifts and requests that are in accepted matches
    const acceptedShiftIds = new Set();
    const acceptedRequestIds = new Set();
    
    if (acceptedMatches) {
      acceptedMatches.forEach(match => {
        acceptedShiftIds.add(match.requester_shift_id);
        acceptedShiftIds.add(match.acceptor_shift_id);
        acceptedRequestIds.add(match.requester_request_id);
        acceptedRequestIds.add(match.acceptor_request_id);
      });
      
      console.log(`Found ${acceptedMatches.length} accepted matches that may affect availability`);
    }
    
    // Now check for potential matches
    const matches = [];
    
    // Create maps for quick lookups
    const shiftsById = {};
    allShifts.forEach(s => {
      shiftsById[s.id] = {
        ...s,
        normalizedDate: s.date,
        type: getShiftType(s.start_time)
      };
    });
    
    const preferredDatesByRequest = {};
    (allPreferredDates || []).forEach(d => {
      if (!preferredDatesByRequest[d.request_id]) {
        preferredDatesByRequest[d.request_id] = [];
      }
      preferredDatesByRequest[d.request_id].push(d);
    });
    
    // Check each user request against each other request
    for (const userRequest of userRequests) {
      const userShift = shiftsById[userRequest.requester_shift_id];
      if (!userShift) continue;
      
      for (const otherRequest of otherRequests) {
        // Skip if users are the same
        if (userRequest.requester_id === otherRequest.requester_id) continue;
        
        console.log(`Processing match between user request ${userRequest.id} and other request ${otherRequest.id}`);
        
        const otherShift = shiftsById[otherRequest.requester_shift_id];
        if (!otherShift) continue;
        
        // Check compatibility
        const userPrefDates = preferredDatesByRequest[userRequest.id] || [];
        const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
        
        console.log(`Checking compatibility between requests ${userRequest.id} and ${otherRequest.id}`);
        
        // Check if user wants other's shift date
        const userWantsOtherDate = userPrefDates.some(d => d.date === otherShift.normalizedDate);
        
        // Check if other wants user's shift date
        const otherWantsUserDate = otherPrefDates.some(d => d.date === userShift.normalizedDate);
        
        if (userWantsOtherDate && otherWantsUserDate) {
          console.log(`MATCH FOUND between ${userRequest.id} and ${otherRequest.id}`);
          
          // Check if this match already exists
          const { data: existingMatch, error: matchCheckError } = await serviceClient
            .from('shift_swap_potential_matches')
            .select('id, status')
            .or(`and(requester_request_id.eq.${userRequest.id},acceptor_request_id.eq.${otherRequest.id}),and(requester_request_id.eq.${otherRequest.id},acceptor_request_id.eq.${userRequest.id})`)
            .limit(1);
          
          if (!matchCheckError && (!existingMatch || existingMatch.length === 0)) {
            // Check if any part of this match is affected by accepted matches
            const isUserShiftInAcceptedMatch = acceptedShiftIds.has(userShift.id);
            const isOtherShiftInAcceptedMatch = acceptedShiftIds.has(otherShift.id);
            const isUserRequestInAcceptedMatch = acceptedRequestIds.has(userRequest.id);
            const isOtherRequestInAcceptedMatch = acceptedRequestIds.has(otherRequest.id);
            
            // Set status according to any conflicts
            let initialStatus = 'pending';
            if (isUserShiftInAcceptedMatch || isOtherShiftInAcceptedMatch || 
                isUserRequestInAcceptedMatch || isOtherRequestInAcceptedMatch) {
              initialStatus = 'otherAccepted';
              console.log(`Setting initial status to otherAccepted due to conflict`);
            }
            
            // ALWAYS create match with user request as the requester
            // This ensures "Your Shift" is always the user's shift they want to swap
            const { data: newMatch, error: createError } = await serviceClient
              .from('shift_swap_potential_matches')
              .insert({
                requester_request_id: userRequest.id,
                acceptor_request_id: otherRequest.id,
                requester_shift_id: userRequest.requester_shift_id,
                acceptor_shift_id: otherRequest.requester_shift_id,
                match_date: new Date().toISOString().split('T')[0],
                status: initialStatus
              })
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating match:', createError);
            } else {
              console.log('New match created with status:', newMatch.status);
              
              // Add formatted match data
              const { data: otherProfile } = await serviceClient
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', otherRequest.requester_id)
                .single();
              
              matches.push({
                match_id: newMatch.id,
                match_status: newMatch.status,
                created_at: newMatch.created_at,
                match_date: newMatch.match_date,
                my_request_id: userRequest.id,
                other_request_id: otherRequest.id,
                my_shift_id: userShift.id,
                my_shift_date: userShift.date,
                my_shift_start_time: userShift.start_time,
                my_shift_end_time: userShift.end_time,
                my_shift_truck: userShift.truck_name || null,
                my_shift_colleague_type: userShift.colleague_type || 'Unknown',
                other_shift_id: otherShift.id,
                other_shift_date: otherShift.date,
                other_shift_start_time: otherShift.start_time,
                other_shift_end_time: otherShift.end_time,
                other_shift_truck: otherShift.truck_name || null,
                other_shift_colleague_type: otherShift.colleague_type || 'Unknown',
                other_user_id: otherRequest.requester_id,
                other_user_name: otherProfile ? 
                  `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() : 
                  'Other User'
              });
            }
          } else if (!matchCheckError && existingMatch && existingMatch.length > 0) {
            // Match exists, check if we need to update its status
            const existingStatus = existingMatch[0].status;
            
            // Check if any part of this match is affected by accepted matches
            const isUserShiftInAcceptedMatch = acceptedShiftIds.has(userShift.id);
            const isOtherShiftInAcceptedMatch = acceptedShiftIds.has(otherShift.id);
            const isUserRequestInAcceptedMatch = acceptedRequestIds.has(userRequest.id);
            const isOtherRequestInAcceptedMatch = acceptedRequestIds.has(otherRequest.id);
            
            // If the match is pending but should be otherAccepted due to a conflict
            if (existingStatus === 'pending' && 
                (isUserShiftInAcceptedMatch || isOtherShiftInAcceptedMatch || 
                isUserRequestInAcceptedMatch || isOtherRequestInAcceptedMatch)) {
              
              // Update the match status to otherAccepted
              console.log(`Updating match ${existingMatch[0].id} from pending to otherAccepted due to conflict`);
              
              await serviceClient
                .from('shift_swap_potential_matches')
                .update({ status: 'otherAccepted' })
                .eq('id', existingMatch[0].id);
            }
            
            console.log('Match already exists:', existingStatus);
          }
        }
      }
    }
    
    return matches;
  } catch (error) {
    console.error("Error in manual matching:", error);
    return [];
  }
}

// Helper to determine shift type based on start time
function getShiftType(startTime) {
  if (!startTime) return 'unknown';
  
  let startHour;
  if (typeof startTime === 'string') {
    startHour = parseInt(startTime.split(':')[0], 10);
  } else {
    // Assume it's a Date object
    startHour = startTime.getHours();
  }
  
  if (startHour <= 8) {
    return 'day';
  } else if (startHour > 8 && startHour < 16) {
    return 'afternoon';
  } else {
    return 'night';
  }
}
