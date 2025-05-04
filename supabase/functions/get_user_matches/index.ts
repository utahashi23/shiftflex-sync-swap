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
    const { user_id, verbose = false, specific_check = false, force_check = false, bypass_rls = false } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing request for user_id: ${user_id}, verbose: ${verbose}, force_check: ${force_check}, specific_check: ${specific_check}`);

    // Always use the service role client to bypass RLS issues
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    console.log("Using service role to fetch match data...");
    
    // Special debug for specific users or if requested
    if (verbose || specific_check) {
      console.log("Enhanced logging enabled");

      // First, check for pending swap requests for this user and others
      const { data: pendingRequests, error: requestsError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .eq('status', 'pending');

      if (requestsError) {
        console.error('Error fetching pending requests:', requestsError);
      } else {
        console.log(`Found ${pendingRequests?.length || 0} total pending swap requests`);
        
        // Get shifts for all pending requests
        const shiftIds = pendingRequests?.map(req => req.requester_shift_id).filter(Boolean) || [];
        if (shiftIds.length > 0) {
          const { data: shifts, error: shiftsError } = await serviceClient
            .from('shifts')
            .select('*')
            .in('id', shiftIds);
            
          if (shiftsError) {
            console.error('Error fetching shifts:', shiftsError);
          } else {
            console.log(`Found ${shifts?.length || 0} shifts for pending requests`);
            
            // Create a map of shifts by ID
            const shiftsMap = {};
            shifts?.forEach(shift => {
              shiftsMap[shift.id] = {
                ...shift,
                normalizedDate: shift.date,
                type: getShiftType(shift.start_time)
              };
            });
            
            // Get preferred dates for all requests
            const requestIds = pendingRequests?.map(req => req.id).filter(Boolean) || [];
            const { data: preferredDates, error: datesError } = await serviceClient
              .from('shift_swap_preferred_dates')
              .select('*')
              .in('request_id', requestIds);
              
            if (datesError) {
              console.error('Error fetching preferred dates:', datesError);
            } else {
              console.log(`Found ${preferredDates?.length || 0} preferred dates for all requests`);
              
              // Group preferred dates by request
              const preferredDatesByRequest = {};
              preferredDates?.forEach(date => {
                if (!preferredDatesByRequest[date.request_id]) {
                  preferredDatesByRequest[date.request_id] = [];
                }
                preferredDatesByRequest[date.request_id].push({
                  date: date.date,
                  accepted_types: date.accepted_types || []
                });
              });
              
              // Group shifts by user
              const shiftsByUser = {};
              shifts?.forEach(shift => {
                if (!shiftsByUser[shift.user_id]) {
                  shiftsByUser[shift.user_id] = [];
                }
                shiftsByUser[shift.user_id].push(shift.date);
              });
              
              // Group requests by user
              const requestsByUser = {};
              pendingRequests?.forEach(req => {
                if (!requestsByUser[req.requester_id]) {
                  requestsByUser[req.requester_id] = [];
                }
                requestsByUser[req.requester_id].push(req);
              });
              
              // Check compatibility between all request pairs
              const userRequests = requestsByUser[user_id] || [];
              const otherRequests = pendingRequests?.filter(req => req.requester_id !== user_id) || [];
              
              console.log(`User ${user_id} has ${userRequests.length} requests to check against ${otherRequests.length} other requests`);
              
              // Try all combinations
              for (const userRequest of userRequests) {
                const userShift = shiftsMap[userRequest.requester_shift_id];
                if (!userShift) {
                  console.log(`No shift found for user request ${userRequest.id}, skipping`);
                  continue;
                }
                
                for (const otherRequest of otherRequests) {
                  const otherShift = shiftsMap[otherRequest.requester_shift_id];
                  if (!otherShift) {
                    console.log(`No shift found for other request ${otherRequest.id}, skipping`);
                    continue;
                  }
                  
                  console.log(`\n******* Checking compatibility *******`);
                  console.log(`User request ${userRequest.id} (shift: ${userShift.date}) vs Other request ${otherRequest.id} (shift: ${otherShift.date})`);
                  
                  // Check preferred dates compatibility
                  const userPrefDates = preferredDatesByRequest[userRequest.id] || [];
                  const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
                  
                  console.log(`User preferred dates:`, userPrefDates.map(d => d.date));
                  console.log(`Other preferred dates:`, otherPrefDates.map(d => d.date));
                  
                  // Check if user wants other's shift date
                  const userWantsOtherDate = userPrefDates.some(d => d.date === otherShift.date);
                  // Check if other wants user's shift date
                  const otherWantsUserDate = otherPrefDates.some(d => d.date === userShift.date);
                  
                  console.log(`User wants other's date: ${userWantsOtherDate}`);
                  console.log(`Other wants user's date: ${otherWantsUserDate}`);
                  
                  if (userWantsOtherDate && otherWantsUserDate) {
                    console.log(`✅ POTENTIAL MATCH FOUND: user ${userRequest.requester_id} <-> ${otherRequest.requester_id}`);
                    
                    // Check if this match exists already
                    const { data: existingMatch } = await serviceClient
                      .rpc('check_existing_match', {
                        request_id1: userRequest.id,
                        request_id2: otherRequest.id
                      });
                      
                    if (existingMatch && existingMatch.length > 0) {
                      console.log('Match already exists:', existingMatch);
                      
                      // Get formatted match data
                      const matchDetails = await getMatchDetails(serviceClient, existingMatch, user_id);
                      return new Response(
                        JSON.stringify(matchDetails || []),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                      );
                    } else {
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
                        .select()
                        .single();
                        
                      if (createError) {
                        console.error('Error creating match:', createError);
                      } else {
                        console.log('Successfully created match:', newMatch);
                        const matchDetails = await getMatchDetails(serviceClient, [newMatch], user_id);
                        return new Response(
                          JSON.stringify(matchDetails || []),
                          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                      }
                    }
                  } else {
                    console.log(`❌ NO MATCH`);
                  }
                }
              }
            }
          }
        }
      }
    }
  
    // Get existing matches
    const { data: directMatches, error: directError } = await serviceClient
      .from('shift_swap_potential_matches')
      .select('*');
      
    if (directError) {
      console.error('Error checking potential matches directly:', directError);
    } else {
      console.log(`Direct check: Found ${directMatches?.length || 0} entries in potential_matches table`);
      
      if (directMatches && directMatches.length > 0) {
        // Filter matches that involve the current user
        const userMatchRequests = await getUserRequestIds(serviceClient, user_id);
        const userInvolvedMatches = directMatches.filter(match => 
          userMatchRequests.includes(match.requester_request_id) || 
          userMatchRequests.includes(match.acceptor_request_id)
        );
        
        console.log(`Found ${userInvolvedMatches.length} matches involving user ${user_id}`);
        
        if (userInvolvedMatches.length > 0) {
          // Get detailed info for these matches
          const matchData = await getMatchDetails(serviceClient, userInvolvedMatches, user_id);
          return new Response(
            JSON.stringify(matchData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }
    }
    
    // If we get here and force_check is true, attempt manual matching
    if (force_check || verbose) {
      console.log("Attempting manual matching process...");
      const manualMatches = await attemptManualMatching(serviceClient, user_id);
      
      if (manualMatches && manualMatches.length > 0) {
        console.log(`Manual matching found ${manualMatches.length} potential matches`);
        return new Response(
          JSON.stringify(manualMatches),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }
    
    // Return empty array if nothing was found
    return new Response(
      JSON.stringify([]),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
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
    // Determine which request belongs to the current user
    const { data: requests, error: reqError } = await serviceClient
      .from('shift_swap_requests')
      .select('*')
      .in('id', [match.requester_request_id, match.acceptor_request_id]);
      
    if (reqError) {
      console.error('Error fetching requests for match:', reqError);
      continue;
    }
    
    if (!requests || requests.length < 2) {
      console.log('Incomplete match data, skipping');
      continue;
    }
    
    // Figure out which request is the user's and which is the other person's
    const userRequest = requests.find(r => r.requester_id === userId);
    const otherRequest = requests.find(r => r.requester_id !== userId);
    
    if (!userRequest || !otherRequest) {
      console.log('Could not determine user and other request, skipping');
      continue;
    }
    
    // Get shift details
    const { data: shifts, error: shiftsError } = await serviceClient
      .from('shifts')
      .select('*')
      .in('id', [userRequest.requester_shift_id, otherRequest.requester_shift_id]);
      
    if (shiftsError || !shifts || shifts.length < 2) {
      console.log('Could not fetch shift details, skipping');
      continue;
    }
    
    // Match shifts to requests
    const userShift = shifts.find(s => s.id === userRequest.requester_shift_id);
    const otherShift = shifts.find(s => s.id === otherRequest.requester_shift_id);
    
    // Get other user's profile
    const { data: otherProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', otherRequest.requester_id)
      .single();
    
    // Format the match data
    results.push({
      match_id: match.id,
      match_status: match.status,
      created_at: match.created_at,
      match_date: match.match_date,
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
        'Unknown User'
    });
  }
  
  return results;
}

// Helper function to attempt manual matching using service role client
async function attemptManualMatching(serviceClient, userId) {
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
            // Record the new match
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
