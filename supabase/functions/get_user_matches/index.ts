
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
    const { user_id, verbose = false, specific_check = false } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing request for user_id: ${user_id}, verbose: ${verbose}`);

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Special debug for specific users mentioned in the issue
    if (verbose) {
      if (user_id === '0dba6413-6ab5-46c9-9db1-ecca3b444e34' || 
          user_id === 'b6da71dc-3749-4b92-849a-1977ff196e67') {
        console.log(`Processing special debug for user ${user_id}`);

        // Get the specific requests mentioned
        const { data: specificRequests, error: specificError } = await supabaseClient
          .from('shift_swap_requests')
          .select('*')
          .in('id', ['b70b145b-965f-462c-b8c0-366865dc7f02', '3ecb141f-5b7e-4cb2-bd83-532345876ed6']);

        if (specificError) {
          console.error('Error fetching specific requests:', specificError);
        } else {
          console.log('Specific requests found:', specificRequests);
          
          // Get shifts for these specific requests
          if (specificRequests && specificRequests.length > 0) {
            const shiftIds = specificRequests.map(req => req.requester_shift_id).filter(Boolean);
            
            const { data: specificShifts, error: shiftsError } = await supabaseClient
              .from('shifts')
              .select('*')
              .in('id', shiftIds);
              
            if (shiftsError) {
              console.error('Error fetching specific shifts:', shiftsError);
            } else {
              console.log('Specific shifts found:', specificShifts);
            }
            
            // Get preferred dates
            const requestIds = specificRequests.map(req => req.id);
            const { data: preferredDates, error: datesError } = await supabaseClient
              .from('shift_swap_preferred_dates')
              .select('*')
              .in('request_id', requestIds);
              
            if (datesError) {
              console.error('Error fetching preferred dates:', datesError);
            } else {
              console.log('Preferred dates for specific requests:', preferredDates);
            }
          }
        }
      }
    }
    
    // Check for any potential matches directly
    const { data: directMatches, error: directError } = await supabaseClient
      .from('shift_swap_potential_matches')
      .select('*');
      
    if (directError) {
      console.error('Error checking potential matches directly:', directError);
    } else {
      console.log(`Direct check: Found ${directMatches?.length || 0} entries in potential_matches table`);
      
      if (directMatches && directMatches.length > 0) {
        // Filter matches that involve the current user
        const userMatchRequests = await getUserRequestIds(supabaseClient, user_id);
        const userInvolvedMatches = directMatches.filter(match => 
          userMatchRequests.includes(match.requester_request_id) || 
          userMatchRequests.includes(match.acceptor_request_id)
        );
        
        console.log(`Found ${userInvolvedMatches.length} matches involving user ${user_id}`);
        
        if (userInvolvedMatches.length > 0) {
          // Try to get detailed info for these matches
          const matchData = await getMatchDetails(supabaseClient, userInvolvedMatches, user_id);
          return new Response(
            JSON.stringify(matchData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }
    }
    
    // Try the RPC function which has worked reliably
    console.log(`Using RPC function to get matches for user ${user_id}`);
    
    const { data: matchesData, error: matchesError } = await supabaseClient
      .rpc('get_user_matches_with_rls', { user_id });
    
    if (matchesError) {
      console.error('Error fetching matches via RPC:', matchesError);
      throw matchesError;
    }
    
    // Ensure we have an array to work with
    const matches = matchesData || [];
    
    console.log(`Found ${matches.length} potential matches via RPC`);
    
    // Get only distinct matches by match_id
    const seen = new Set<string>();
    const distinctMatches = matches.filter(match => {
      if (!match || !match.match_id || seen.has(match.match_id)) {
        return false;
      }
      seen.add(match.match_id);
      return true;
    });
    
    console.log(`Returning ${distinctMatches.length} distinct matches after deduplication`);
    
    if (distinctMatches.length === 0 && verbose) {
      // Force check if we should find matches but don't have any
      console.log("No matches found - attempting to run manual matching process");
      const manualMatches = await attemptManualMatching(supabaseClient, user_id);
      
      if (manualMatches && manualMatches.length > 0) {
        console.log(`Manual matching found ${manualMatches.length} potential matches`);
        return new Response(
          JSON.stringify(manualMatches),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }
    
    return new Response(
      JSON.stringify(distinctMatches),
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

// Helper function to get request IDs for a user
async function getUserRequestIds(supabaseClient, userId) {
  const { data, error } = await supabaseClient
    .from('shift_swap_requests')
    .select('id')
    .eq('requester_id', userId);
    
  if (error) {
    console.error('Error getting user request IDs:', error);
    return [];
  }
  
  return data ? data.map(r => r.id) : [];
}

// Helper function to get detailed match info
async function getMatchDetails(supabaseClient, matches, userId) {
  const results = [];
  
  for (const match of matches) {
    // Determine which request belongs to the current user
    const { data: requests, error: reqError } = await supabaseClient
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
    const { data: shifts, error: shiftsError } = await supabaseClient
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
    const { data: otherProfile, error: profileError } = await supabaseClient
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

// Helper function to attempt manual matching
async function attemptManualMatching(supabaseClient, userId) {
  try {
    console.log("Starting manual matching process");
    
    // Get user's requests and shifts
    const { data: userRequests, error: reqError } = await supabaseClient
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
    const { data: otherRequests, error: otherReqError } = await supabaseClient
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
    const allShiftIds = [...userRequests, ...otherRequests].map(r => r.requester_shift_id);
    const { data: allShifts, error: shiftsError } = await supabaseClient
      .from('shifts')
      .select('*')
      .in('id', allShiftIds);
      
    if (shiftsError || !allShifts) {
      console.log("Error fetching shifts");
      return [];
    }
    
    console.log(`Fetched ${allShifts.length} shifts for matching`);
    
    // Get preferred dates for all requests
    const allRequestIds = [...userRequests, ...otherRequests].map(r => r.id);
    const { data: allPreferredDates, error: datesError } = await supabaseClient
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
          const { data: existingMatch, error: matchCheckError } = await supabaseClient
            .from('shift_swap_potential_matches')
            .select('id')
            .or(`and(requester_request_id.eq.${userRequest.id},acceptor_request_id.eq.${otherRequest.id}),and(requester_request_id.eq.${otherRequest.id},acceptor_request_id.eq.${userRequest.id})`)
            .limit(1);
            
          if (!matchCheckError && (!existingMatch || existingMatch.length === 0)) {
            // Record the new match
            const { data: newMatch, error: createError } = await supabaseClient
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
                other_user_name: 'Other User' // We could get the real name with another query
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
