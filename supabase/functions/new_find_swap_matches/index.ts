
// Edge function to find potential shift swap matches
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id;
    const verbose = body.verbose || false;
    
    if (!userId) {
      return createErrorResponse('Missing user_id in request body', 400);
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Client with auth context from request
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Admin client for secure operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log(`Finding swap matches for user ${userId}`);

    // Get user's active requests
    const { data: userRequests, error: requestsError } = await supabaseAdmin
      .from('improved_shift_swaps')
      .select('*')
      .eq('requester_id', userId)
      .eq('status', 'pending');

    if (requestsError) {
      console.error(`Error fetching user requests: ${requestsError.message}`);
      return createErrorResponse(`Error fetching user requests: ${requestsError.message}`, 500);
    }

    if (!userRequests || userRequests.length === 0) {
      console.log('No active swap requests found for user');
      return createSuccessResponse({
        matches: [],
        message: "No active swap requests found"
      });
    }

    console.log(`Found ${userRequests.length} active requests for user ${userId}`);

    // Get shifts for all user's requests
    const userShiftIds = userRequests.map(req => req.requester_shift_id);
    const { data: userShifts, error: shiftsError } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .in('id', userShiftIds);

    if (shiftsError) {
      console.error(`Error fetching user shifts: ${shiftsError.message}`);
      return createErrorResponse(`Error fetching user shifts: ${shiftsError.message}`, 500);
    }

    if (verbose) {
      console.log(`User shifts:`, userShifts);
    }

    // Get potential matches from other users' requests
    const { data: otherRequests, error: otherReqsError } = await supabaseAdmin
      .from('improved_shift_swaps')
      .select('*')
      .neq('requester_id', userId)
      .eq('status', 'pending')
      .is('matched_with_id', null);

    if (otherReqsError) {
      console.error(`Error fetching other requests: ${otherReqsError.message}`);
      return createErrorResponse(`Error fetching other requests: ${otherReqsError.message}`, 500);
    }

    if (!otherRequests || otherRequests.length === 0) {
      console.log('No other users have active swap requests');
      return createSuccessResponse({
        matches: [],
        message: "No potential matches found"
      });
    }

    console.log(`Found ${otherRequests.length} requests from other users`);

    // Get shifts for other users' requests
    const otherShiftIds = otherRequests.map(req => req.requester_shift_id);
    const { data: otherShifts, error: otherShiftsError } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .in('id', otherShiftIds);

    if (otherShiftsError) {
      console.error(`Error fetching other shifts: ${otherShiftsError.message}`);
      return createErrorResponse(`Error fetching other shifts: ${otherShiftsError.message}`, 500);
    }

    if (verbose) {
      console.log(`Other shifts:`, otherShifts);
    }

    // Get additional wanted dates for user requests
    const { data: allUserWantedDates, error: wantedDatesError } = await supabaseAdmin
      .from('improved_swap_wanted_dates')
      .select('*')
      .in('swap_id', userRequests.map(req => req.id));

    if (wantedDatesError) {
      console.log(`Warning fetching wanted dates: ${wantedDatesError.message}`);
      // Continue anyway, not a fatal error
    }

    const userWantedDatesMap = new Map();
    if (allUserWantedDates) {
      allUserWantedDates.forEach(dateObj => {
        if (!userWantedDatesMap.has(dateObj.swap_id)) {
          userWantedDatesMap.set(dateObj.swap_id, []);
        }
        userWantedDatesMap.get(dateObj.swap_id).push(dateObj.date);
      });
    }

    // Get additional wanted dates for other requests
    const { data: allOtherWantedDates, error: otherWantedDatesError } = await supabaseAdmin
      .from('improved_swap_wanted_dates')
      .select('*')
      .in('swap_id', otherRequests.map(req => req.id));

    if (otherWantedDatesError) {
      console.log(`Warning fetching other wanted dates: ${otherWantedDatesError.message}`);
      // Continue anyway, not a fatal error
    }

    const otherWantedDatesMap = new Map();
    if (allOtherWantedDates) {
      allOtherWantedDates.forEach(dateObj => {
        if (!otherWantedDatesMap.has(dateObj.swap_id)) {
          otherWantedDatesMap.set(dateObj.swap_id, []);
        }
        otherWantedDatesMap.get(dateObj.swap_id).push(dateObj.date);
      });
    }

    // Get user profiles for display names
    const allUserIds = [...new Set([
      ...otherRequests.map(req => req.requester_id)
    ])];
    
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, employee_id')
      .in('id', allUserIds);
    
    if (profilesError) {
      console.log(`Warning fetching profiles: ${profilesError.message}`);
      // Continue anyway, not a fatal error
    }
    
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }

    // Now look at each user request and find potential matches
    const potentialMatches = [];
    
    for (const userRequest of userRequests) {
      const userShift = userShifts.find(s => s.id === userRequest.requester_shift_id);
      if (!userShift) {
        console.log(`Could not find user shift ${userRequest.requester_shift_id}`);
        continue; // Skip if we can't find the shift
      }

      // Get all dates this user wants (primary + additional)
      const allWantedDates = [userRequest.wanted_date];
      const additionalDates = userWantedDatesMap.get(userRequest.id) || [];
      additionalDates.forEach(date => allWantedDates.push(date));

      if (verbose) {
        console.log(`Request ${userRequest.id} wanted dates:`, allWantedDates);
        console.log(`User shift date: ${userShift.date}, accepts: ${userRequest.accepted_shift_types.join(', ')}`);
      }

      for (const otherRequest of otherRequests) {
        const otherShift = otherShifts.find(s => s.id === otherRequest.requester_shift_id);
        if (!otherShift) {
          console.log(`Could not find other shift ${otherRequest.requester_shift_id}`);
          continue; // Skip if we can't find the shift
        }

        // Get all dates the other user wants (primary + additional)
        const allOtherWantedDates = [otherRequest.wanted_date];
        const otherAdditionalDates = otherWantedDatesMap.get(otherRequest.id) || [];
        otherAdditionalDates.forEach(date => allOtherWantedDates.push(date));
        
        if (verbose) {
          console.log(`Other request ${otherRequest.id} wanted dates:`, allOtherWantedDates);
          console.log(`Other shift date: ${otherShift.date}, accepts: ${otherRequest.accepted_shift_types.join(', ')}`);
        }

        // Check if this is a potential match
        // Our user wants the other user's shift date, and vice versa
        const userWantsOtherShift = allWantedDates.includes(otherShift.date);
        const otherWantsUserShift = allOtherWantedDates.includes(userShift.date);
        
        console.log(`Checking match: User ${userId} and other user ${otherRequest.requester_id}`);
        console.log(`User wants other shift: ${userWantsOtherShift}, Other wants user shift: ${otherWantsUserShift}`);
        console.log(`User shift date: ${userShift.date}, Other shift date: ${otherShift.date}`);
        
        if (userWantsOtherShift && otherWantsUserShift) {
          // Check shift type compatibility
          const userShiftType = getShiftType(userShift.start_time);
          const otherShiftType = getShiftType(otherShift.start_time);
          
          const userAcceptsOtherType = otherRequest.accepted_shift_types.includes(userShiftType);
          const otherAcceptsUserType = userRequest.accepted_shift_types.includes(otherShiftType);
          
          console.log(`User shift type: ${userShiftType}, Other accepts: ${userAcceptsOtherType}`);
          console.log(`Other shift type: ${otherShiftType}, User accepts: ${otherAcceptsUserType}`);
          
          if (userAcceptsOtherType && otherAcceptsUserType) {
            // We have a match! Calculate compatibility score
            let score = 80; // Base score for mutual date match
            
            // Add points for same truck or region
            if (userShift.truck_name === otherShift.truck_name) {
              score += 20;
            }
            
            // Get user profile details for the match
            const otherProfile = profileMap.get(otherRequest.requester_id);
              
            // Add the match to our results
            potentialMatches.push({
              request1_id: userRequest.id,
              request2_id: otherRequest.id,
              requester1_id: userId,
              requester2_id: otherRequest.requester_id,
              compatibility_score: score,
              is_requester1: true,
              my_shift: {
                ...userShift,
                type: userShiftType
              },
              other_shift: {
                ...otherShift,
                type: otherShiftType,
                userName: otherProfile ? `${otherProfile.first_name} ${otherProfile.last_name}` : 'Unknown User',
                employee_id: otherProfile?.employee_id
              }
            });
            
            console.log(`✓ MATCH FOUND! Score: ${score}`);
          }
        }
      }
    }

    console.log(`Found ${potentialMatches.length} potential matches`);
    
    if (potentialMatches.length === 0) {
      // Log details to help troubleshoot why no matches were found
      console.log("Diagnostics for why no matches were found:");
      console.log(`User has ${userRequests.length} requests`);
      
      for (const req of userRequests) {
        const shift = userShifts.find(s => s.id === req.requester_shift_id);
        console.log(`Request ${req.id}: User wants date ${req.wanted_date}, has shift on ${shift?.date}`);
        
        // Additional wanted dates
        const additionalDates = userWantedDatesMap.get(req.id) || [];
        if (additionalDates.length > 0) {
          console.log(`  Additional wanted dates: ${additionalDates.join(', ')}`);
        }
      }
      
      // Check if there are any potential date matches regardless of other criteria
      let dateMatchesFound = 0;
      for (const userReq of userRequests) {
        const userShift = userShifts.find(s => s.id === userReq.requester_shift_id);
        if (!userShift) continue;
        
        const userWantedDates = [userReq.wanted_date, ...(userWantedDatesMap.get(userReq.id) || [])];
        
        for (const otherReq of otherRequests) {
          const otherShift = otherShifts.find(s => s.id === otherReq.requester_shift_id);
          if (!otherShift) continue;
          
          const otherWantedDates = [otherReq.wanted_date, ...(otherWantedDatesMap.get(otherReq.id) || [])];
          
          if (userWantedDates.includes(otherShift.date) && otherWantedDates.includes(userShift.date)) {
            dateMatchesFound++;
            console.log(`Found date match between user req ${userReq.id} and other req ${otherReq.id}`);
            console.log(`  But shift type compatibility failed:`);
            console.log(`  User shift type: ${getShiftType(userShift.start_time)}, accepted by other: ${otherReq.accepted_shift_types.includes(getShiftType(userShift.start_time))}`);
            console.log(`  Other shift type: ${getShiftType(otherShift.start_time)}, accepted by user: ${userReq.accepted_shift_types.includes(getShiftType(otherShift.start_time))}`);
          }
        }
      }
      
      console.log(`Found ${dateMatchesFound} potential date matches that failed other criteria`);
    }

    return createSuccessResponse({
      matches: potentialMatches,
      count: potentialMatches.length
    });

  } catch (error) {
    console.error('Error in new_find_swap_matches:', error);
    return createErrorResponse(error.message || 'Unknown error occurred', 500);
  }
});

// Helper function to determine shift type from start time
function getShiftType(timeStr: string): string {
  const hour = parseInt(timeStr.split(':')[0], 10);
  
  if (hour < 12) return 'day';
  if (hour < 18) return 'afternoon';
  return 'night';
}
