
// Simple matching algorithm to find potential swaps
// This is a straightforward algorithm that checks if two users want each other's shifts

import { supabase } from '@/integrations/supabase/client';

export const findSimpleMatches = async (userId: string) => {
  console.log("Starting simple matching algorithm for user:", userId);
  
  try {
    // Step 1: Get all pending swap requests from the current user
    const { data: userRequests, error: userRequestsError } = await supabase
      .from('shift_swap_requests')
      .select(`
        id, 
        requester_id,
        requester_shift_id,
        status
      `)
      .eq('requester_id', userId)
      .eq('status', 'pending');

    if (userRequestsError) {
      console.error("Error fetching user requests:", userRequestsError);
      return { success: false, error: userRequestsError };
    }

    if (!userRequests || userRequests.length === 0) {
      console.log("No pending swap requests found for user");
      return { success: true, matches: [] };
    }

    console.log(`Found ${userRequests.length} pending requests for user`);

    // Step 2: Get the details of the shifts the user wants to swap
    const userShiftIds = userRequests.map(req => req.requester_shift_id);
    const { data: userShifts, error: userShiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('id', userShiftIds);

    if (userShiftsError) {
      console.error("Error fetching user shifts:", userShiftsError);
      return { success: false, error: userShiftsError };
    }

    // Step 3: Get all preferred dates for the user's requests
    const userRequestIds = userRequests.map(req => req.id);
    const { data: userPreferredDates, error: userPreferredDatesError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', userRequestIds);

    if (userPreferredDatesError) {
      console.error("Error fetching user preferred dates:", userPreferredDatesError);
      return { success: false, error: userPreferredDatesError };
    }

    // Step 4: Get all other pending swap requests (not from this user)
    const { data: otherRequests, error: otherRequestsError } = await supabase
      .from('shift_swap_requests')
      .select(`
        id, 
        requester_id,
        requester_shift_id,
        status
      `)
      .neq('requester_id', userId)
      .eq('status', 'pending');

    if (otherRequestsError) {
      console.error("Error fetching other requests:", otherRequestsError);
      return { success: false, error: otherRequestsError };
    }

    if (!otherRequests || otherRequests.length === 0) {
      console.log("No other pending swap requests found");
      return { success: true, matches: [] };
    }

    console.log(`Found ${otherRequests.length} pending requests from other users`);

    // Step 5: Get shifts for all other requests
    const otherShiftIds = otherRequests.map(req => req.requester_shift_id);
    const { data: otherShifts, error: otherShiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('id', otherShiftIds);

    if (otherShiftsError) {
      console.error("Error fetching other shifts:", otherShiftsError);
      return { success: false, error: otherShiftsError };
    }

    // Step 6: Get all preferred dates for all other requests
    const otherRequestIds = otherRequests.map(req => req.id);
    const { data: otherPreferredDates, error: otherPreferredDatesError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', otherRequestIds);

    if (otherPreferredDatesError) {
      console.error("Error fetching other preferred dates:", otherPreferredDatesError);
      return { success: false, error: otherPreferredDatesError };
    }

    // Create lookup maps for efficient matching
    const shiftsById = {};
    userShifts?.forEach(shift => { shiftsById[shift.id] = shift; });
    otherShifts?.forEach(shift => { shiftsById[shift.id] = shift; });

    const preferredDatesByRequestId = {};
    userPreferredDates?.forEach(date => {
      if (!preferredDatesByRequestId[date.request_id]) {
        preferredDatesByRequestId[date.request_id] = [];
      }
      preferredDatesByRequestId[date.request_id].push(date);
    });
    
    otherPreferredDates?.forEach(date => {
      if (!preferredDatesByRequestId[date.request_id]) {
        preferredDatesByRequestId[date.request_id] = [];
      }
      preferredDatesByRequestId[date.request_id].push(date);
    });

    // Step 7: Find potential matches
    const matches = [];

    // For each user request...
    for (const userRequest of userRequests) {
      const userShift = shiftsById[userRequest.requester_shift_id];
      if (!userShift) continue;
      
      const userPreferredDatesForRequest = preferredDatesByRequestId[userRequest.id] || [];
      const userPreferredDateStrings = userPreferredDatesForRequest.map(pd => pd.date);

      console.log(`Processing user request ${userRequest.id}:`);
      console.log(`- User shift date: ${userShift.date}`);
      console.log(`- User preferred dates: ${userPreferredDateStrings.join(', ')}`);

      // For each other request...
      for (const otherRequest of otherRequests) {
        const otherShift = shiftsById[otherRequest.requester_shift_id];
        if (!otherShift) continue;
        
        const otherPreferredDatesForRequest = preferredDatesByRequestId[otherRequest.id] || [];
        const otherPreferredDateStrings = otherPreferredDatesForRequest.map(pd => pd.date);

        console.log(`Checking against other request ${otherRequest.id}:`);
        console.log(`- Other shift date: ${otherShift.date}`);
        console.log(`- Other preferred dates: ${otherPreferredDateStrings.join(', ')}`);

        // Check if the user wants the other user's shift date
        const userWantsOtherShift = userPreferredDateStrings.includes(otherShift.date);
        
        // Check if the other user wants the user's shift date
        const otherWantsUserShift = otherPreferredDateStrings.includes(userShift.date);

        console.log(`- User wants other shift: ${userWantsOtherShift}`);
        console.log(`- Other user wants user shift: ${otherWantsUserShift}`);
        
        // If both users want each other's shifts, we have a match!
        if (userWantsOtherShift && otherWantsUserShift) {
          console.log("✅ MATCH FOUND!");
          
          // Check if a match already exists for these requests
          const { data: existingMatch, error: checkError } = await supabase
            .from('shift_swap_potential_matches')
            .select('id')
            .or(`requester_request_id.eq.${userRequest.id},acceptor_request_id.eq.${userRequest.id}`)
            .or(`requester_request_id.eq.${otherRequest.id},acceptor_request_id.eq.${otherRequest.id}`)
            .limit(1);
            
          if (checkError) {
            console.error("Error checking existing match:", checkError);
            continue;
          }
          
          if (existingMatch && existingMatch.length > 0) {
            console.log(`Match already exists with ID: ${existingMatch[0].id}`);
            continue;
          }
          
          // Create a new match record
          const { data: newMatch, error: createError } = await supabase
            .from('shift_swap_potential_matches')
            .insert({
              requester_request_id: userRequest.id,
              acceptor_request_id: otherRequest.id,
              requester_shift_id: userRequest.requester_shift_id,
              acceptor_shift_id: otherRequest.requester_shift_id,
              match_date: new Date().toISOString().split('T')[0],
              status: 'pending'
            })
            .select()
            .single();
            
          if (createError) {
            console.error("Error creating match:", createError);
            continue;
          }
          
          console.log(`Created new match with ID: ${newMatch.id}`);
          matches.push(newMatch);
        }
      }
    }

    // Step 8: Return all matches involving the user
    const { data: allUserMatches, error: allMatchesError } = await supabase
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
      .or(`
        requester_request_id.in.(${userRequestIds.join(',')}),
        acceptor_request_id.in.(${userRequestIds.join(',')})
      `);
      
    if (allMatchesError) {
      console.error("Error fetching all user matches:", allMatchesError);
      return { success: true, matches: matches }; // Return only the new matches
    }

    // Format the matches for display
    const formattedMatches = await formatMatchesForDisplay(allUserMatches, userId);
    
    return { 
      success: true, 
      matches: formattedMatches,
      newMatches: matches.length,
      totalMatches: formattedMatches.length
    };
    
  } catch (error) {
    console.error("Error in findSimpleMatches:", error);
    return { success: false, error };
  }
};

// Helper function to format matches for display
async function formatMatchesForDisplay(matches, userId) {
  if (!matches || matches.length === 0) {
    return [];
  }
  
  // Gather all the IDs we need to fetch
  const requestIds = new Set();
  const shiftIds = new Set();
  
  matches.forEach(match => {
    requestIds.add(match.requester_request_id);
    requestIds.add(match.acceptor_request_id);
    shiftIds.add(match.requester_shift_id);
    shiftIds.add(match.acceptor_shift_id);
  });
  
  // Fetch all the requests
  const { data: requests, error: requestsError } = await supabase
    .from('shift_swap_requests')
    .select('id, requester_id')
    .in('id', Array.from(requestIds));
    
  if (requestsError) {
    console.error("Error fetching requests for display:", requestsError);
    return [];
  }
  
  // Fetch all the shifts
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, date, start_time, end_time, truck_name, user_id')
    .in('id', Array.from(shiftIds));
    
  if (shiftsError) {
    console.error("Error fetching shifts for display:", shiftsError);
    return [];
  }
  
  // Create lookup maps
  const requestsMap = {};
  requests.forEach(req => { requestsMap[req.id] = req; });
  
  const shiftsMap = {};
  shifts.forEach(shift => { shiftsMap[shift.id] = shift; });
  
  // Get unique user IDs to fetch profiles
  const userIds = new Set();
  requests.forEach(req => { userIds.add(req.requester_id); });
  shifts.forEach(shift => { userIds.add(shift.user_id); });
  
  // Fetch user profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', Array.from(userIds));
    
  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }
  
  const profilesMap = {};
  profiles?.forEach(profile => { 
    profilesMap[profile.id] = profile;
  });
  
  // Format the matches
  return matches.map(match => {
    // Determine which request belongs to the current user
    const requesterRequest = requestsMap[match.requester_request_id];
    const acceptorRequest = requestsMap[match.acceptor_request_id];
    
    // Determine if the current user is the requester or acceptor
    const isRequester = requesterRequest && requesterRequest.requester_id === userId;
    
    // Get the shifts
    const requesterShift = shiftsMap[match.requester_shift_id];
    const acceptorShift = shiftsMap[match.acceptor_shift_id];
    
    // Determine "my" shift and "other" shift based on who the current user is
    const myShift = isRequester ? requesterShift : acceptorShift;
    const otherShift = isRequester ? acceptorShift : requesterShift;
    
    // Get the other user's info
    const otherUserId = isRequester ? 
      (acceptorRequest ? acceptorRequest.requester_id : null) : 
      (requesterRequest ? requesterRequest.requester_id : null);
    
    const otherProfile = profilesMap[otherUserId];
    const otherUserName = otherProfile ? 
      `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() : 
      'Unknown User';
    
    // Handle shift type based on start time
    const getShiftType = (startTime) => {
      if (!startTime) return 'day';
      const hour = parseInt(startTime.split(':')[0], 10);
      if (hour <= 8) return 'day';
      if (hour > 8 && hour < 16) return 'afternoon';
      return 'night';
    };
    
    return {
      id: match.id,
      status: match.status,
      createdAt: match.created_at,
      myRequestId: isRequester ? match.requester_request_id : match.acceptor_request_id,
      otherRequestId: isRequester ? match.acceptor_request_id : match.requester_request_id,
      myShift: {
        id: myShift?.id,
        date: myShift?.date,
        startTime: myShift?.start_time,
        endTime: myShift?.end_time,
        truckName: myShift?.truck_name,
        type: getShiftType(myShift?.start_time)
      },
      otherShift: {
        id: otherShift?.id,
        date: otherShift?.date,
        startTime: otherShift?.start_time,
        endTime: otherShift?.end_time,
        truckName: otherShift?.truck_name,
        type: getShiftType(otherShift?.start_time),
        userId: otherUserId,
        userName: otherUserName
      }
    };
  });
}
