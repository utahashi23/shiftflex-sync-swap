
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
    // Parse request body
    const { 
      user_id, 
      force_check = false, 
      verbose = false, 
      user_perspective_only = true, 
      user_initiator_only = true,
      include_colleague_types = true,
      include_shift_data = true,
      bypass_rls = false,
      include_accepted_status = true
    } = await req.json()

    // Validate user ID
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (verbose) {
      console.log(`Processing request for user_id: ${user_id}, verbose: ${verbose}, force_check: ${force_check}, user_perspective_only: ${user_perspective_only}, user_initiator_only: ${user_initiator_only}, include_colleague_types: ${include_colleague_types}`)
    }

    // Create supabase client
    const supabaseClient = createClient(
      // Supabase API URL
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // For requests that bypass RLS, use service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Use the appropriate client based on the bypass_rls flag
    const client = bypass_rls ? supabaseAdmin : supabaseClient

    if (verbose) {
      console.log("Using service role to fetch user's requests...")
    }

    // First fetch all swap requests for the specified user
    const { data: userRequests, error: userRequestsError } = await client
      .from('shift_swap_requests')
      .select('id, requester_id, requester_shift_id, status')
      .eq('requester_id', user_id)
      .eq('status', 'pending')

    if (userRequestsError) {
      console.error('Error fetching user requests:', userRequestsError)
      throw userRequestsError
    }

    if (verbose) {
      console.log(`Found ${userRequests?.length || 0} pending requests for user ${user_id}`)
    }

    // If user_initiator_only is false, fetch all other pending requests (not from the current user)
    let otherRequests = []
    if (!user_initiator_only) {
      const { data: allOtherRequests, error: otherRequestsError } = await client
        .from('shift_swap_requests')
        .select('id, requester_id, requester_shift_id, status')
        .eq('status', 'pending')
        .neq('requester_id', user_id)

      if (otherRequestsError) {
        console.error('Error fetching other requests:', otherRequestsError)
        throw otherRequestsError
      }

      otherRequests = allOtherRequests || []
    } else {
      // Just fetch all other pending requests as before
      const { data: allOtherRequests, error: otherRequestsError } = await client
        .from('shift_swap_requests')
        .select('id, requester_id, requester_shift_id, status')
        .eq('status', 'pending')
        .neq('requester_id', user_id)

      if (otherRequestsError) {
        console.error('Error fetching other requests:', otherRequestsError)
        throw otherRequestsError
      }

      otherRequests = allOtherRequests || []
    }

    if (verbose) {
      console.log(`Found ${otherRequests.length} pending requests from other users`)
    }

    // If there are no user requests, return an empty array
    if (!userRequests || userRequests.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Fetch all shift data needed for matching
    const shiftIds = [
      ...userRequests.map(req => req.requester_shift_id),
      ...otherRequests.map(req => req.requester_shift_id)
    ]

    const { data: shiftsData, error: shiftsError } = await client
      .from('shifts')
      .select('id, date, start_time, end_time, truck_name, colleague_type, user_id')
      .in('id', shiftIds)

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError)
      throw shiftsError
    }

    if (verbose) {
      console.log(`Fetched ${shiftsData?.length || 0} shifts data`)
      console.log(`First shift from database:`, shiftsData?.[0])
    }

    // Create a map of shift IDs to shift data
    const shiftsMap = new Map()
    if (shiftsData) {
      shiftsData.forEach(shift => {
        shiftsMap.set(shift.id, shift)
      })
    }

    // Fetch preferred dates for matching
    const requestIds = [...userRequests.map(req => req.id), ...otherRequests.map(req => req.id)]
    
    const { data: preferredDates, error: preferredDatesError } = await client
      .from('shift_swap_preferred_dates')
      .select('request_id, date, accepted_types')
      .in('request_id', requestIds)

    if (preferredDatesError) {
      console.error('Error fetching preferred dates:', preferredDatesError)
      throw preferredDatesError
    }

    if (verbose) {
      console.log(`Fetched ${preferredDates?.length || 0} preferred dates`)
    }

    // Create a map of request IDs to preferred dates
    const requestPreferredDatesMap = new Map()
    if (preferredDates) {
      preferredDates.forEach(prefDate => {
        if (!requestPreferredDatesMap.has(prefDate.request_id)) {
          requestPreferredDatesMap.set(prefDate.request_id, [])
        }
        requestPreferredDatesMap.get(prefDate.request_id).push(prefDate)
      })
    }

    // Fetch all existing matches to avoid duplicates
    const { data: existingMatches, error: existingMatchesError } = await client
      .from('shift_swap_potential_matches')
      .select('*')

    if (existingMatchesError) {
      console.error('Error fetching existing matches:', existingMatchesError)
      throw existingMatchesError
    }

    const existingMatchMap = new Map()
    if (existingMatches) {
      existingMatches.forEach(match => {
        // Create key combinations of request IDs to identify existing matches
        const key1 = `${match.requester_request_id}_${match.acceptor_request_id}`
        const key2 = `${match.acceptor_request_id}_${match.requester_request_id}`
        existingMatchMap.set(key1, match)
        existingMatchMap.set(key2, match)
      })
    }

    // Find matches between user requests and other requests
    const matches = []
    
    // Process each user request
    for (const userRequest of userRequests) {
      const userShift = shiftsMap.get(userRequest.requester_shift_id)
      const userPreferredDates = requestPreferredDatesMap.get(userRequest.id) || []

      if (verbose) {
        console.log(`User request ${userRequest.id} has ${userPreferredDates.length} preferred dates`)
      }

      // Check each other request for compatibility
      for (const otherRequest of otherRequests) {
        const otherShift = shiftsMap.get(otherRequest.requester_shift_id)
        const otherPreferredDates = requestPreferredDatesMap.get(otherRequest.id) || []

        // Skip if the shifts don't exist
        if (!userShift || !otherShift) continue

        // Check if this is a potential match - user's shift matches other's preferred date?
        const userShiftMatchesOtherPreference = otherPreferredDates.some(prefDate => {
          return prefDate.date === userShift.date &&
                 prefDate.accepted_types.includes(
                   getShiftType(userShift.start_time)
                 )
        })

        // Check if other's shift matches user's preferred date
        const otherShiftMatchesUserPreference = userPreferredDates.some(prefDate => {
          return prefDate.date === otherShift.date &&
                 prefDate.accepted_types.includes(
                   getShiftType(otherShift.start_time)
                 )
        })

        // If there's a match in either direction
        if (userShiftMatchesOtherPreference || otherShiftMatchesUserPreference) {
          const matchKey = `${userRequest.id}_${otherRequest.id}`
          const existingMatch = existingMatchMap.get(matchKey)

          if (verbose) {
            console.log(`MATCH FOUND between ${userRequest.id} and ${otherRequest.id}`)
          }

          // Create a match record if it doesn't exist
          if (existingMatch) {
            if (verbose) {
              console.log(`Match already exists:`, existingMatch)
            }

            // Get user information for the match participants
            let otherUserId = null
            let otherUserName = null

            // Get the other user's information (if the match involves us)
            if (existingMatch.requester_request_id === userRequest.id) {
              // The user is the requester, get the acceptor's info
              const acceptorRequest = otherRequests.find(
                req => req.id === existingMatch.acceptor_request_id
              )
              otherUserId = acceptorRequest?.requester_id
            } else if (existingMatch.acceptor_request_id === userRequest.id) {
              // The user is the acceptor, get the requester's info
              const requesterRequest = otherRequests.find(
                req => req.id === existingMatch.requester_request_id
              )
              otherUserId = requesterRequest?.requester_id
            }

            // Fetch user names
            if (otherUserId) {
              const { data: userData } = await client
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', otherUserId)
                .single()

              if (userData) {
                otherUserName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown User'
              }
            }

            // Determine which shift is the user's and which is the other user's
            const isUserRequester = existingMatch.requester_request_id === userRequest.id
            const myShiftId = isUserRequester ? existingMatch.requester_shift_id : existingMatch.acceptor_shift_id
            const otherShiftId = isUserRequester ? existingMatch.acceptor_shift_id : existingMatch.requester_shift_id
            
            const myShift = shiftsMap.get(myShiftId)
            const otherShift = shiftsMap.get(otherShiftId)
            
            if (!myShift || !otherShift) continue

            // Create the match object for the API response
            const matchObj = {
              match_id: existingMatch.id,
              match_status: existingMatch.status,
              my_request_id: isUserRequester ? existingMatch.requester_request_id : existingMatch.acceptor_request_id,
              other_request_id: isUserRequester ? existingMatch.acceptor_request_id : existingMatch.requester_request_id,
              my_shift_id: myShiftId,
              my_shift_date: myShift.date,
              my_shift_start_time: myShift.start_time,
              my_shift_end_time: myShift.end_time,
              my_shift_truck: myShift.truck_name,
              my_shift_type: getShiftType(myShift.start_time),
              my_shift_colleague_type: myShift.colleague_type,
              other_shift_id: otherShiftId,
              other_shift_date: otherShift.date,
              other_shift_start_time: otherShift.start_time,
              other_shift_end_time: otherShift.end_time,
              other_shift_truck: otherShift.truck_name,
              other_user_id: otherUserId,
              other_user_name: otherUserName,
              other_shift_colleague_type: otherShift.colleague_type,
              created_at: existingMatch.created_at
            }

            matches.push(matchObj)
          } else {
            // This section handles creating new matches - we check if we're doing a full match check
            if (force_check) {
              try {
                // Record the match in the database
                const result = await recordMatch(client, {
                  request1: userRequest,
                  request2: otherRequest,
                  shift1: shiftsMap.get(userRequest.requester_shift_id),
                  shift2: shiftsMap.get(otherRequest.requester_shift_id)
                }, verbose)

                if (result && result.success) {
                  // If a match was created, add it to matches
                  if (!result.alreadyExists && result.matchData) {
                    const newMatch = result.matchData
                    
                    // Determine which shift is the user's and which is the other user's
                    const isUserRequester = newMatch.requester_request_id === userRequest.id
                    const myShiftId = isUserRequester ? newMatch.requester_shift_id : newMatch.acceptor_shift_id
                    const otherShiftId = isUserRequester ? newMatch.acceptor_shift_id : newMatch.requester_shift_id
                    
                    const myShift = shiftsMap.get(myShiftId)
                    const otherShift = shiftsMap.get(otherShiftId)

                    // Get other user ID and name
                    const otherUserId = isUserRequester ? 
                      otherRequest.requester_id : userRequest.requester_id
                    
                    let otherUserName = 'Unknown User'
                    try {
                      const { data: userData } = await client
                        .from('profiles')
                        .select('first_name, last_name')
                        .eq('id', otherUserId)
                        .single()

                      if (userData) {
                        otherUserName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown User'
                      }
                    } catch (err) {
                      console.error('Error fetching user name:', err)
                    }

                    // Create the match object for the API response
                    const matchObj = {
                      match_id: newMatch.id,
                      match_status: newMatch.status,
                      my_request_id: isUserRequester ? newMatch.requester_request_id : newMatch.acceptor_request_id,
                      other_request_id: isUserRequester ? newMatch.acceptor_request_id : newMatch.requester_request_id,
                      my_shift_id: myShiftId,
                      my_shift_date: myShift.date,
                      my_shift_start_time: myShift.start_time,
                      my_shift_end_time: myShift.end_time,
                      my_shift_truck: myShift.truck_name,
                      my_shift_type: getShiftType(myShift.start_time),
                      my_shift_colleague_type: myShift.colleague_type,
                      other_shift_id: otherShiftId,
                      other_shift_date: otherShift.date,
                      other_shift_start_time: otherShift.start_time,
                      other_shift_end_time: otherShift.end_time,
                      other_shift_truck: otherShift.truck_name,
                      other_user_id: otherUserId,
                      other_user_name: otherUserName,
                      other_shift_colleague_type: otherShift.colleague_type,
                      created_at: newMatch.created_at
                    }

                    matches.push(matchObj)
                  }
                }
              } catch (error) {
                console.error('Error recording match:', error)
              }
            }
          }
        }
      }
    }

    // When include_accepted_status is true, check all potential matches and update statuses
    // This ensures all users see the correct status regardless of their role in the match
    if (include_accepted_status) {
      // Get all accepted matches in the system
      const { data: acceptedMatches, error: acceptedMatchesError } = await client
        .from('shift_swap_potential_matches')
        .select('*')
        .eq('status', 'accepted');
      
      if (acceptedMatchesError) {
        console.error('Error fetching accepted matches:', acceptedMatchesError);
      }
      else if (acceptedMatches && acceptedMatches.length > 0) {
        // Create a lookup for accepted matches by request ID
        const acceptedMatchesByRequestId = new Map();
        
        // For each accepted match, record both request IDs as being in an accepted match
        acceptedMatches.forEach(match => {
          acceptedMatchesByRequestId.set(match.requester_request_id, match);
          acceptedMatchesByRequestId.set(match.acceptor_request_id, match);
        });
        
        // Now process all matches to check if any of them should be marked as accepted
        // for user requests that are part of an accepted match elsewhere
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          
          // Check if this match's requests are part of an accepted match
          const acceptedMatch = acceptedMatchesByRequestId.get(match.my_request_id) || 
                               acceptedMatchesByRequestId.get(match.other_request_id);
          
          if (acceptedMatch) {
            // If this is not the accepted match itself (different ID), mark it as accepted
            // so the user knows they can't take it anymore
            if (acceptedMatch.id !== match.match_id && match.match_status === 'pending') {
              if (verbose) {
                console.log(`Marking match ${match.match_id} as accepted because requests are part of accepted match ${acceptedMatch.id}`);
              }
              
              // Update the status for display purposes only (this doesn't change the database)
              match.match_status = 'accepted';
            }
          }
        }
      }
    }

    // Format the matches for the API response
    if (verbose) {
      if (matches.length > 0) {
        console.log(`Processing match with shifts:`, {
          shift1: {
            id: matches[0].other_shift_id,
            colleague_type: matches[0].other_shift_colleague_type
          },
          shift2: {
            id: matches[0].my_shift_id,
            colleague_type: matches[0].my_shift_colleague_type
          }
        });
      }
      console.log(`Returning ${matches.length} formatted matches`);
      if (matches.length > 0) {
        console.log(`First formatted match:`, {
          match_id: matches[0].match_id,
          my_shift_colleague_type: matches[0].my_shift_colleague_type,
          other_shift_colleague_type: matches[0].other_shift_colleague_type
        });
      }
    }

    return new Response(
      JSON.stringify(matches),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Helper function to get shift type from start time
function getShiftType(startTime: string): 'day' | 'afternoon' | 'night' | 'unknown' {
  const hour = parseInt(startTime.split(':')[0], 10);
  
  if (hour >= 5 && hour < 12) return 'day';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 || hour < 5) return 'night';
  
  return 'unknown';
}

// Helper function to record a match in the database
async function recordMatch(client: any, data: any, verbose = false) {
  try {
    const { request1, request2, shift1, shift2 } = data;
    
    // Check if a match already exists
    const { data: existingMatch, error: existingMatchError } = await client
      .from('shift_swap_potential_matches')
      .select('*')
      .or(`and(requester_request_id.eq.${request1.id},acceptor_request_id.eq.${request2.id}),and(requester_request_id.eq.${request2.id},acceptor_request_id.eq.${request1.id})`)
      .limit(1)
      .single();
      
    if (existingMatchError && existingMatchError.code !== 'PGRST116') {
      console.error('Error checking for existing match:', existingMatchError);
      return { success: false, error: existingMatchError };
    }
    
    if (existingMatch) {
      if (verbose) {
        console.log('Match already exists:', existingMatch);
      }
      return { success: true, alreadyExists: true, matchData: existingMatch };
    }
    
    // Create the match
    const { data: matchData, error: matchError } = await client
      .from('shift_swap_potential_matches')
      .insert({
        requester_request_id: request1.id,
        acceptor_request_id: request2.id,
        requester_shift_id: request1.requester_shift_id,
        acceptor_shift_id: request2.requester_shift_id,
        match_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      })
      .select()
      .single();
      
    if (matchError) {
      console.error('Error creating match:', matchError);
      return { success: false, error: matchError };
    }
    
    return { success: true, alreadyExists: false, matchData };
  } catch (error) {
    console.error('Error in recordMatch:', error);
    return { success: false, error };
  }
}
