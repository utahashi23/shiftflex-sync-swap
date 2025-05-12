
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
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
    );
    
    // Use the service role to fetch requests directly without RLS issues
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    try {
      console.log("Using service role to fetch user's requests...");
      
      // Get user's pending requests
      const { data: userRequests, error: userRequestsError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .eq('requester_id', user_id)
        .eq('status', 'pending');
      
      if (userRequestsError) {
        console.error('Error fetching user requests:', userRequestsError);
        throw userRequestsError;
      }

      console.log(`Found ${userRequests?.length || 0} pending requests for user ${user_id}`);
      
      if (!userRequests || userRequests.length === 0) {
        console.log('No pending requests found');
        
        // Even if no pending requests, we should still fetch existing matches
        const { data: existingMatches, error: existingMatchesError } = await serviceClient
          .from('shift_swap_potential_matches')
          .select(`
            id,
            status,
            requester_request_id,
            acceptor_request_id,
            requester_shift_id,
            acceptor_shift_id,
            created_at,
            match_date
          `);
          
        if (existingMatchesError) {
          console.error('Error fetching existing matches:', existingMatchesError);
          throw existingMatchesError;
        }
        
        console.log(`Found ${existingMatches?.length || 0} existing matches`);
        
        // For each match, check if the current user is involved
        const userMatches = [];
        
        for (const match of existingMatches) {
          // Get the requester and acceptor requests to determine if user is involved
          const requestIds = [match.requester_request_id, match.acceptor_request_id].filter(Boolean);
          
          if (requestIds.length === 0) continue;
          
          const { data: requests, error: requestsError } = await serviceClient
            .from('shift_swap_requests')
            .select('id, requester_id, requester_shift_id')
            .in('id', requestIds);
            
          if (requestsError) {
            console.error('Error fetching requests for match:', requestsError);
            continue;
          }
          
          // Check if user is involved in any of the requests
          const userInvolved = requests.some(req => req.requester_id === user_id);
          
          if (userInvolved) {
            console.log(`User is involved in match ${match.id}`);
            userMatches.push(match);
          }
        }
        
        if (userMatches.length === 0) {
          console.log('No matches found involving the user');
          return new Response(
            JSON.stringify([]),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        // Process each match to get complete information
        const formattedMatches = [];
        
        for (const match of userMatches) {
          // Get the requester and acceptor requests
          const { data: requesterRequest, error: reqError } = await serviceClient
            .from('shift_swap_requests')
            .select('*')
            .eq('id', match.requester_request_id)
            .single();
            
          if (reqError) {
            console.error('Error fetching requester request:', reqError);
            continue;
          }
          
          const { data: acceptorRequest, error: accError } = await serviceClient
            .from('shift_swap_requests')
            .select('*')
            .eq('id', match.acceptor_request_id)
            .single();
            
          if (accError) {
            console.error('Error fetching acceptor request:', accError);
            continue;
          }
          
          // Get shift data
          const shiftIds = [
            requesterRequest.requester_shift_id,
            acceptorRequest.requester_shift_id
          ].filter(Boolean);
          
          const { data: shifts, error: shiftsError } = await serviceClient
            .from('shifts')
            .select('*')
            .in('id', shiftIds);
            
          if (shiftsError) {
            console.error('Error fetching shifts:', shiftsError);
            continue;
          }
          
          // Map shifts to requests
          const requesterShift = shifts.find(s => s.id === requesterRequest.requester_shift_id);
          const acceptorShift = shifts.find(s => s.id === acceptorRequest.requester_shift_id);
          
          if (!requesterShift || !acceptorShift) {
            console.error('Could not find all shifts for match', match.id);
            continue;
          }
          
          // Get user info
          const { data: requesterUser, error: reqUserError } = await serviceClient
            .from('profiles')
            .select('first_name, last_name, employee_id')
            .eq('id', requesterRequest.requester_id)
            .single();
            
          if (reqUserError) {
            console.error('Error fetching requester user:', reqUserError);
            continue;
          }
          
          const { data: acceptorUser, error: accUserError } = await serviceClient
            .from('profiles')
            .select('first_name, last_name, employee_id')
            .eq('id', acceptorRequest.requester_id)
            .single();
            
          if (accUserError) {
            console.error('Error fetching acceptor user:', accUserError);
            continue;
          }
          
          // Check acceptances
          const { data: acceptances, error: acceptancesError } = await serviceClient
            .from('shift_swap_acceptances')
            .select('user_id')
            .eq('match_id', match.id);
            
          if (acceptancesError) {
            console.error('Error fetching acceptances:', acceptancesError);
            continue;
          }
          
          const currentUserAccepted = acceptances.some(a => a.user_id === user_id);
          const otherUserId = requesterRequest.requester_id === user_id 
              ? acceptorRequest.requester_id 
              : requesterRequest.requester_id;
          const otherUserAccepted = acceptances.some(a => a.user_id === otherUserId);
          
          // Format the match from the perspective of the current user
          const isUserRequester = requesterRequest.requester_id === user_id;
          
          const formattedMatch = {
            match_id: match.id,
            match_status: match.status,
            is_other_accepted: match.status === 'other_accepted',
            created_at: match.created_at,
            match_date: match.match_date,
            my_request_id: isUserRequester ? requesterRequest.id : acceptorRequest.id,
            other_request_id: isUserRequester ? acceptorRequest.id : requesterRequest.id,
            my_shift_id: isUserRequester ? requesterShift.id : acceptorShift.id,
            my_shift_date: isUserRequester ? requesterShift.date : acceptorShift.date,
            my_shift_start_time: isUserRequester ? requesterShift.start_time : acceptorShift.start_time,
            my_shift_end_time: isUserRequester ? requesterShift.end_time : acceptorShift.end_time,
            my_shift_truck: isUserRequester ? requesterShift.truck_name : acceptorShift.truck_name,
            my_shift_colleague_type: isUserRequester ? requesterShift.colleague_type : acceptorShift.colleague_type,
            my_employee_id: isUserRequester ? requesterUser.employee_id : acceptorUser.employee_id,
            other_shift_id: isUserRequester ? acceptorShift.id : requesterShift.id,
            other_shift_date: isUserRequester ? acceptorShift.date : requesterShift.date,
            other_shift_start_time: isUserRequester ? acceptorShift.start_time : requesterShift.start_time,
            other_shift_end_time: isUserRequester ? acceptorShift.end_time : requesterShift.end_time,
            other_shift_truck: isUserRequester ? acceptorShift.truck_name : requesterShift.truck_name,
            other_shift_colleague_type: isUserRequester ? acceptorShift.colleague_type : requesterShift.colleague_type,
            other_user_id: isUserRequester ? acceptorRequest.requester_id : requesterRequest.requester_id,
            other_user_name: isUserRequester 
              ? `${acceptorUser.first_name || ''} ${acceptorUser.last_name || ''}`.trim()
              : `${requesterUser.first_name || ''} ${requesterUser.last_name || ''}`.trim(),
            other_employee_id: isUserRequester ? acceptorUser.employee_id : requesterUser.employee_id,
            has_accepted: currentUserAccepted,
            other_has_accepted: otherUserAccepted,
            requester_id: requesterRequest.requester_id // To track who initiated the swap
          };
          
          formattedMatches.push(formattedMatch);
        }
        
        console.log(`Returning ${formattedMatches.length} formatted matches for existing matches`);
        
        return new Response(
          JSON.stringify(formattedMatches),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      // Continue with the normal flow if there are pending requests
      // Get all other users' pending requests
      const { data: otherRequests, error: otherRequestsError } = await serviceClient
        .from('shift_swap_requests')
        .select('*')
        .neq('requester_id', user_id)
        .eq('status', 'pending');
      
      if (otherRequestsError) {
        console.error('Error fetching other users\' requests:', otherRequestsError);
        throw otherRequestsError;
      }

      console.log(`Found ${otherRequests?.length || 0} pending requests from other users`);
      
      if (!otherRequests || otherRequests.length === 0) {
        console.log('No pending requests from other users');
        return new Response(
          JSON.stringify([]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
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
        throw shiftsError;
      }

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

      // Get profiles for employee_id
      const userIds = [...shifts.map(s => s.user_id)].filter(Boolean);
      const { data: profiles, error: profilesError } = await serviceClient
        .from('profiles')
        .select('id, employee_id')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log(`Fetched ${profiles?.length || 0} profiles`);
      
      // Create a map for quick profile lookups
      const profileMap = {};
      profiles?.forEach(profile => {
        profileMap[profile.id] = profile;
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
        throw prefDatesError;
      }

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
              .or(`requester_request_id.eq.${userRequest.id},acceptor_request_id.eq.${userRequest.id}`)
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
      
      // Get user info for all matches
      if (matches.length > 0) {
        // Process matches to return formatted data
        const formattedMatches = [];
        
        // Add this code to check if a match has been accepted elsewhere
        const { data: potentialMatches } = await serviceClient
          .from('shift_swap_potential_matches')
          .select('*');
          
        // Create a map of request IDs to their accepted matches
        const acceptedRequestMap = new Map();
        
        if (potentialMatches && potentialMatches.length > 0) {
          // Identify all requests involved in accepted matches
          potentialMatches.forEach(match => {
            if (match.status === 'accepted') {
              // Mark both the requester and acceptor requests as involved in an accepted match
              acceptedRequestMap.set(match.requester_request_id, true);
              acceptedRequestMap.set(match.acceptor_request_id, true);
            }
          });
        }
        
        // Get all acceptances to check who has accepted what
        const { data: allAcceptances, error: acceptancesError } = await serviceClient
          .from('shift_swap_acceptances')
          .select('match_id, user_id');
          
        if (acceptancesError) {
          console.error('Error fetching acceptances:', acceptancesError);
        }
        
        // Group acceptances by match_id for easier lookup
        const acceptancesByMatch = {};
        if (allAcceptances) {
          allAcceptances.forEach(acc => {
            if (!acceptancesByMatch[acc.match_id]) {
              acceptancesByMatch[acc.match_id] = [];
            }
            acceptancesByMatch[acc.match_id].push(acc.user_id);
          });
        }
        
        for (const match of matches) {
          // Get user and shift info for both sides of the match
          const req1 = userRequests.find(r => r.id === match.requester_request_id) || 
                      otherRequests.find(r => r.id === match.requester_request_id);
          
          const req2 = userRequests.find(r => r.id === match.acceptor_request_id) || 
                      otherRequests.find(r => r.id === match.acceptor_request_id);
          
          if (!req1 || !req2) continue;
          
          const shift1 = shiftsMap[req1.requester_shift_id];
          const shift2 = shiftsMap[req2.requester_shift_id];
          
          if (!shift1 || !shift2) continue;
          
          // Log shift data to confirm colleague_type
          console.log('Processing match with shifts:', {
            shift1: {
              id: shift1.id,
              colleague_type: shift1.colleague_type
            },
            shift2: {
              id: shift2.id,
              colleague_type: shift2.colleague_type
            }
          });
          
          // Get user info
          const { data: user1 } = await serviceClient
            .from('profiles')
            .select('first_name, last_name, employee_id')
            .eq('id', req1.requester_id)
            .single();
            
          const { data: user2 } = await serviceClient
            .from('profiles')
            .select('first_name, last_name, employee_id')
            .eq('id', req2.requester_id)
            .single();
          
          // Always ensure the user's request is the "my" side
          const isUserReq1 = req1.requester_id === user_id;
          
          // User's shift is first, other user's shift is second
          const myShift = isUserReq1 ? shift1 : shift2;
          const otherShift = isUserReq1 ? shift2 : shift1;

          // Get employee IDs
          const myProfileData = profileMap[isUserReq1 ? req1.requester_id : req2.requester_id];
          const otherProfileData = profileMap[isUserReq1 ? req2.requester_id : req1.requester_id];
          
          const myEmployeeId = myProfileData?.employee_id;
          const otherEmployeeId = otherProfileData?.employee_id;
          
          let matchStatus = match.status || 'pending';
          let isOtherAccepted = false;
          
          // Check if the other request in this match is already involved in an accepted match elsewhere
          if (matchStatus === 'pending' && 
              (acceptedRequestMap.has(isUserReq1 ? req2.id : req1.id) || 
               acceptedRequestMap.has(isUserReq1 ? req1.id : req2.id))) {
            // If either request is involved in an accepted match elsewhere,
            // mark this match as "other_accepted"
            matchStatus = 'other_accepted';
            isOtherAccepted = true;
          }
          
          // Check who has accepted this match
          const acceptances = acceptancesByMatch[match.id] || [];
          const currentUserAccepted = acceptances.includes(user_id);
          const otherUserId = isUserReq1 ? req2.requester_id : req1.requester_id;
          const otherUserAccepted = acceptances.includes(otherUserId);
          
          formattedMatches.push({
            match_id: match.id,
            match_status: matchStatus,
            is_other_accepted: isOtherAccepted,
            created_at: match.created_at,
            match_date: match.match_date,
            my_request_id: isUserReq1 ? req1.id : req2.id,
            other_request_id: isUserReq1 ? req2.id : req1.id,
            my_shift_id: myShift.id,
            my_shift_date: myShift.date,
            my_shift_start_time: myShift.start_time,
            my_shift_end_time: myShift.end_time,
            my_shift_truck: myShift.truck_name,
            my_shift_colleague_type: myShift.colleague_type || 'Unknown',
            my_employee_id: myEmployeeId,
            other_shift_id: otherShift.id,
            other_shift_date: otherShift.date,
            other_shift_start_time: otherShift.start_time,
            other_shift_end_time: otherShift.end_time, 
            other_shift_truck: otherShift.truck_name,
            other_shift_colleague_type: otherShift.colleague_type || 'Unknown',
            other_employee_id: otherEmployeeId,
            other_user_id: isUserReq1 ? req2.requester_id : req1.requester_id,
            other_user_name: isUserReq1 
              ? `${user2?.first_name || ''} ${user2?.last_name || ''}`.trim() 
              : `${user1?.first_name || ''} ${user1?.last_name || ''}`.trim(),
            has_accepted: currentUserAccepted,
            other_has_accepted: otherUserAccepted,
            requester_id: req1.requester_id // To track who initiated the swap
          });
        }
        
        console.log(`Returning ${formattedMatches.length} formatted matches`);
        
        // Log first match to verify colleague_type fields are included
        if (formattedMatches.length > 0) {
          console.log('First formatted match:', {
            match_id: formattedMatches[0].match_id,
            my_shift_colleague_type: formattedMatches[0].my_shift_colleague_type,
            other_shift_colleague_type: formattedMatches[0].other_shift_colleague_type,
            my_employee_id: formattedMatches[0].my_employee_id,
            other_employee_id: formattedMatches[0].other_employee_id,
            has_accepted: formattedMatches[0].has_accepted,
            other_has_accepted: formattedMatches[0].other_has_accepted
          });
        }
        
        return new Response(
          JSON.stringify(formattedMatches),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
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
    );
  }
});
