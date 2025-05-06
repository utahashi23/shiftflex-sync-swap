
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
                  
                  // First get all accepted matches to detect conflicts
                  const { data: acceptedMatches, error: acceptedMatchesError } = await serviceClient
                    .from('shift_swap_potential_matches')
                    .select('*')
                    .eq('status', 'accepted');
                  
                  if (acceptedMatchesError) {
                    console.error('Error fetching accepted matches:', acceptedMatchesError);
                  } else {
                    console.log(`Found ${acceptedMatches?.length || 0} accepted matches for conflict detection`);
                    
                    // Create sets of shifts and requests that are already part of accepted matches
                    const acceptedShiftIds = new Set<string>();
                    const acceptedRequestIds = new Set<string>();
                    
                    // Collect all shift IDs and request IDs from accepted matches
                    if (acceptedMatches) {
                      acceptedMatches.forEach(match => {
                        acceptedShiftIds.add(match.requester_shift_id);
                        acceptedShiftIds.add(match.acceptor_shift_id);
                        acceptedRequestIds.add(match.requester_request_id);
                        acceptedRequestIds.add(match.acceptor_request_id);
                      });
                    }
                    
                    console.log(`Shifts in accepted swaps: ${Array.from(acceptedShiftIds).join(', ')}`);
                    console.log(`Requests in accepted swaps: ${Array.from(acceptedRequestIds).join(', ')}`);
                    
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
                            // Check if this match would conflict with accepted matches
                            const isConflicting = 
                              acceptedShiftIds.has(userRequest.requester_shift_id) || 
                              acceptedShiftIds.has(otherRequest.requester_shift_id) ||
                              acceptedRequestIds.has(userRequest.id) ||
                              acceptedRequestIds.has(otherRequest.id);
                            
                            // Create new match with proper status
                            const newMatchStatus = isConflicting ? 'otherAccepted' : 'pending';
                            
                            if (isConflicting) {
                              console.log(`Match between ${userRequest.id} and ${otherRequest.id} conflicts with an accepted match, setting status to otherAccepted`);
                            }
                            
                            const { data: newMatch, error: createError } = await serviceClient
                              .from('shift_swap_potential_matches')
                              .insert({
                                requester_request_id: userRequest.id,
                                acceptor_request_id: otherRequest.id,
                                requester_shift_id: userRequest.requester_shift_id,
                                acceptor_shift_id: otherRequest.requester_shift_id,
                                match_date: new Date().toISOString().split('T')[0],
                                status: newMatchStatus
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
                            // Check if existing match needs a status update
                            const existingMatchItem = existingMatch[0];
                            
                            // Check if this is a pending match that conflicts with an accepted match
                            if (existingMatchItem.status === 'pending') {
                              const isConflicting = 
                                acceptedShiftIds.has(existingMatchItem.requester_shift_id) || 
                                acceptedShiftIds.has(existingMatchItem.acceptor_shift_id) ||
                                acceptedRequestIds.has(existingMatchItem.requester_request_id) ||
                                acceptedRequestIds.has(existingMatchItem.acceptor_request_id);
                              
                              // If conflicting, update status to otherAccepted
                              if (isConflicting) {
                                console.log(`Updating existing match ${existingMatchItem.id} status to otherAccepted due to conflict`);
                                
                                const { error: updateError } = await serviceClient
                                  .from('shift_swap_potential_matches')
                                  .update({ status: 'otherAccepted' })
                                  .eq('id', existingMatchItem.id);
                                
                                if (updateError) {
                                  console.error('Error updating match status:', updateError);
                                } else {
                                  // Update the local copy for later use
                                  existingMatchItem.status = 'otherAccepted';
                                }
                              }
                            }
                            
                            console.log('Match already exists:', existingMatchItem);
                            matches.push(existingMatchItem);
                          }
                        }
                      }
                    }
                  }
                  
                  // Get all potential matches for the user
                  const { data: userMatches, error: userMatchesError } = await serviceClient
                    .from('shift_swap_potential_matches')
                    .select(`
                      id,
                      status,
                      created_at,
                      match_date,
                      requester_request_id,
                      acceptor_request_id,
                      requester_shift_id,
                      acceptor_shift_id
                    `)
                    .or(`requester_request_id.in.(${userRequests.map(r => r.id).join(',')}),acceptor_request_id.in.(${userRequests.map(r => r.id).join(',')})`)
                    .order('created_at', { ascending: false });
                  
                  if (userMatchesError) {
                    console.error('Error fetching user matches:', userMatchesError);
                  } else {
                    console.log(`Found ${userMatches?.length || 0} existing matches for user`);
                    
                    // Ensure all matches with pending status are properly updated if they conflict with accepted matches
                    for (const match of userMatches || []) {
                      // Only check pending matches
                      if (match.status === 'pending') {
                        const isConflicting = 
                          acceptedShiftIds.has(match.requester_shift_id) || 
                          acceptedShiftIds.has(match.acceptor_shift_id) ||
                          acceptedRequestIds.has(match.requester_request_id) ||
                          acceptedRequestIds.has(match.acceptor_request_id);
                        
                        // If this pending match conflicts with an accepted match, update its status
                        if (isConflicting) {
                          console.log(`Updating existing match ${match.id} status to otherAccepted due to conflict detection`);
                          
                          const { error: updateError } = await serviceClient
                            .from('shift_swap_potential_matches')
                            .update({ status: 'otherAccepted' })
                            .eq('id', match.id);
                          
                          if (updateError) {
                            console.error('Error updating match status:', updateError);
                          } else {
                            // Update the status in the local object for the return data
                            match.status = 'otherAccepted';
                          }
                        }
                      }
                    }
                    
                    // Process matched swaps to return formatted data
                    const formattedMatches = [];
                    
                    // Get all request IDs from user matches
                    const matchRequestIds = [];
                    userMatches?.forEach(match => {
                      matchRequestIds.push(match.requester_request_id);
                      matchRequestIds.push(match.acceptor_request_id);
                    });
                    
                    // Get all requests
                    const { data: allRequests, error: allRequestsError } = await serviceClient
                      .from('shift_swap_requests')
                      .select('*')
                      .in('id', matchRequestIds);
                    
                    if (allRequestsError) {
                      console.error('Error fetching all requests:', allRequestsError);
                    } else {
                      // Create a map of requests by ID
                      const requestsMap = {};
                      allRequests?.forEach(request => {
                        requestsMap[request.id] = request;
                      });
                      
                      // Process each match
                      for (const match of userMatches || []) {
                        // Get the requester and acceptor requests
                        const requesterRequest = requestsMap[match.requester_request_id];
                        const acceptorRequest = requestsMap[match.acceptor_request_id];
                        
                        if (!requesterRequest || !acceptorRequest) {
                          console.log(`Missing request data for match ${match.id}`);
                          continue;
                        }
                        
                        // Get the shift data
                        const requesterShift = shiftsMap[match.requester_shift_id];
                        const acceptorShift = shiftsMap[match.acceptor_shift_id];
                        
                        if (!requesterShift || !acceptorShift) {
                          console.log(`Missing shift data for match ${match.id}`);
                          continue;
                        }
                        
                        // Determine whether the current user is the requester or acceptor
                        const isUserRequester = requesterRequest.requester_id === user_id;
                        
                        // Get the other user's ID
                        const otherUserId = isUserRequester 
                          ? acceptorRequest.requester_id 
                          : requesterRequest.requester_id;
                        
                        // Get other user's name
                        const { data: otherUser } = await serviceClient
                          .from('profiles')
                          .select('first_name, last_name')
                          .eq('id', otherUserId)
                          .single();
                        
                        // Format data for return
                        formattedMatches.push({
                          match_id: match.id,
                          match_status: match.status,
                          created_at: match.created_at,
                          match_date: match.match_date,
                          my_request_id: isUserRequester ? match.requester_request_id : match.acceptor_request_id,
                          other_request_id: isUserRequester ? match.acceptor_request_id : match.requester_request_id,
                          my_shift_id: isUserRequester ? requesterShift.id : acceptorShift.id,
                          my_shift_date: isUserRequester ? requesterShift.date : acceptorShift.date,
                          my_shift_start_time: isUserRequester ? requesterShift.start_time : acceptorShift.start_time,
                          my_shift_end_time: isUserRequester ? requesterShift.end_time : acceptorShift.end_time,
                          my_shift_truck: isUserRequester ? requesterShift.truck_name : acceptorShift.truck_name,
                          my_shift_colleague_type: isUserRequester ? requesterShift.colleague_type : acceptorShift.colleague_type,
                          other_shift_id: isUserRequester ? acceptorShift.id : requesterShift.id,
                          other_shift_date: isUserRequester ? acceptorShift.date : requesterShift.date,
                          other_shift_start_time: isUserRequester ? acceptorShift.start_time : requesterShift.start_time,
                          other_shift_end_time: isUserRequester ? acceptorShift.end_time : requesterShift.end_time,
                          other_shift_truck: isUserRequester ? acceptorShift.truck_name : requesterShift.truck_name,
                          other_shift_colleague_type: isUserRequester ? acceptorShift.colleague_type : requesterShift.colleague_type,
                          other_user_id: otherUserId,
                          other_user_name: otherUser 
                            ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() 
                            : 'Unknown User'
                        });
                      }
                    }
                    
                    // Add any newly created matches that might not be in userMatches
                    for (const newMatch of matches) {
                      const existsInFormatted = formattedMatches.some(fm => fm.match_id === newMatch.id);
                      if (!existsInFormatted) {
                        // This is a new match that needs to be added to the formatted results
                        const requesterRequest = requestsMap[newMatch.requester_request_id];
                        const acceptorRequest = requestsMap[newMatch.acceptor_request_id];
                        
                        if (requesterRequest && acceptorRequest) {
                          const requesterShift = shiftsMap[newMatch.requester_shift_id];
                          const acceptorShift = shiftsMap[newMatch.acceptor_shift_id];
                          
                          if (requesterShift && acceptorShift) {
                            // Determine if user is requester
                            const isUserRequester = requesterRequest.requester_id === user_id;
                            
                            // Get other user's ID
                            const otherUserId = isUserRequester 
                              ? acceptorRequest.requester_id 
                              : requesterRequest.requester_id;
                            
                            // Get other user's name
                            const { data: otherUser } = await serviceClient
                              .from('profiles')
                              .select('first_name, last_name')
                              .eq('id', otherUserId)
                              .single();
                            
                            formattedMatches.push({
                              match_id: newMatch.id,
                              match_status: newMatch.status,
                              created_at: newMatch.created_at,
                              match_date: newMatch.match_date,
                              my_request_id: isUserRequester ? newMatch.requester_request_id : newMatch.acceptor_request_id,
                              other_request_id: isUserRequester ? newMatch.acceptor_request_id : newMatch.requester_request_id,
                              my_shift_id: isUserRequester ? requesterShift.id : acceptorShift.id,
                              my_shift_date: isUserRequester ? requesterShift.date : acceptorShift.date,
                              my_shift_start_time: isUserRequester ? requesterShift.start_time : acceptorShift.start_time,
                              my_shift_end_time: isUserRequester ? requesterShift.end_time : acceptorShift.end_time,
                              my_shift_truck: isUserRequester ? requesterShift.truck_name : acceptorShift.truck_name,
                              my_shift_colleague_type: isUserRequester ? requesterShift.colleague_type : acceptorShift.colleague_type,
                              other_shift_id: isUserRequester ? acceptorShift.id : requesterShift.id,
                              other_shift_date: isUserRequester ? acceptorShift.date : requesterShift.date,
                              other_shift_start_time: isUserRequester ? acceptorShift.start_time : requesterShift.start_time,
                              other_shift_end_time: isUserRequester ? acceptorShift.end_time : requesterShift.end_time,
                              other_shift_truck: isUserRequester ? acceptorShift.truck_name : requesterShift.truck_name,
                              other_shift_colleague_type: isUserRequester ? acceptorShift.colleague_type : requesterShift.colleague_type,
                              other_user_id: otherUserId,
                              other_user_name: otherUser 
                                ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() 
                                : 'Unknown User'
                            });
                          }
                        }
                      }
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
            .select('id')
            .or(`and(requester_request_id.eq.${userRequest.id},acceptor_request_id.eq.${otherRequest.id}),and(requester_request_id.eq.${otherRequest.id},acceptor_request_id.eq.${userRequest.id})`)
            .limit(1);
            
          if (!matchCheckError && (!existingMatch || existingMatch.length === 0)) {
            // ALWAYS create match with user request as the requester
            // This ensures "Your Shift" is always the user's shift they want to swap
            const { data: newMatch, error: createError } = await serviceClient
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
              
            if (createError) {
              console.error('Error creating match:', createError);
            } else {
              console.log('New match created:', newMatch);
              
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
                other_shift_id: otherShift.id,
                other_shift_date: otherShift.date,
                other_shift_start_time: otherShift.start_time,
                other_shift_end_time: otherShift.end_time,
                other_shift_truck: otherShift.truck_name || null,
                other_user_id: otherRequest.requester_id,
                other_user_name: otherProfile ? 
                  `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() : 
                  'Other User'
              });
            }
          } else {
            console.log('Match already exists or check error');
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
