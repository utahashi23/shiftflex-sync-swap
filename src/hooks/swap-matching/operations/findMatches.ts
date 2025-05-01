
import { checkSwapCompatibility } from '@/utils/swap-matching';

/**
 * Find potential matches among swap requests
 * @param allRequests All pending swap requests
 * @param allShifts All shifts related to the requests
 * @param preferredDates All preferred dates for the requests
 * @param profilesMap Map of user profiles
 * @param userId Optional user ID to filter requests (for non-admin users)
 * @param forceCheck Optional flag to check for matches even if already matched
 */
export const findMatches = (
  allRequests: any[],
  allShifts: any[],
  preferredDates: any[],
  profilesMap: Record<string, any>,
  userId?: string,
  forceCheck: boolean = false
) => {
  console.log('Finding matches among', allRequests.length, 'requests');
  
  // Create mappings for faster lookups
  const shiftMap = new Map();
  const shiftsByUser: Record<string, string[]> = {};
  const preferredDatesByRequest: Record<string, any[]> = {};
  
  // Map shifts by ID and group by user
  allShifts.forEach(shift => {
    shiftMap.set(shift.id, {
      ...shift,
      normalizedDate: shift.date,
      type: determineShiftType(shift.start_time)
    });
    
    if (!shiftsByUser[shift.user_id]) {
      shiftsByUser[shift.user_id] = [];
    }
    
    shiftsByUser[shift.user_id].push(shift.date);
  });
  
  // Group preferred dates by request
  preferredDates.forEach(date => {
    if (!preferredDatesByRequest[date.request_id]) {
      preferredDatesByRequest[date.request_id] = [];
    }
    preferredDatesByRequest[date.request_id].push(date);
  });
  
  const matches = [];
  const checkedPairs = new Set();
  
  // If userId is provided, split requests into user's and others'
  const myRequests = userId 
    ? allRequests.filter(req => req.requester_id === userId)
    : allRequests;
    
  const otherRequests = userId
    ? allRequests.filter(req => req.requester_id !== userId)
    : allRequests;
  
  // For admin or when no userId is provided, compare all requests with each other
  if (!userId) {
    for (let i = 0; i < allRequests.length; i++) {
      for (let j = i + 1; j < allRequests.length; j++) {
        const request1 = allRequests[i];
        const request2 = allRequests[j];
        
        // Skip checks between the same user's requests
        if (request1.requester_id === request2.requester_id) {
          continue;
        }
        
        checkForMatch(request1, request2);
      }
    }
  } 
  // For regular users, compare their requests with other users'
  else {
    for (const myRequest of myRequests) {
      for (const otherRequest of otherRequests) {
        checkForMatch(myRequest, otherRequest);
      }
    }
  }
  
  // Helper function to check if two requests match
  function checkForMatch(request1: any, request2: any) {
    // Generate a unique pair ID (order doesn't matter)
    const pairId = [request1.id, request2.id].sort().join('_');
    
    // Skip if we've already checked this pair
    if (checkedPairs.has(pairId)) {
      return;
    }
    
    checkedPairs.add(pairId);
    
    // Get the shifts for both requests
    const shift1 = shiftMap.get(request1.requester_shift_id);
    const shift2 = shiftMap.get(request2.requester_shift_id);
    
    if (!shift1 || !shift2) {
      console.log('Missing shift data for request', !shift1 ? request1.id : request2.id);
      return;
    }
    
    // Check if the shifts are compatible for swapping
    const { isCompatible } = checkSwapCompatibility(
      request1, 
      request2,
      shift1,
      shift2,
      preferredDatesByRequest,
      shiftsByUser
    );
    
    if (isCompatible) {
      matches.push({
        request: request1,
        otherRequest: request2
      });
    }
  }
  
  console.log(`Found ${matches.length} potential matches`);
  return matches;
};

/**
 * Determine shift type based on start time
 */
function determineShiftType(startTime: string): 'day' | 'afternoon' | 'night' {
  const startHour = parseInt(startTime.split(':')[0], 10);
  
  if (startHour <= 8) {
    return 'day';
  } else if (startHour > 8 && startHour < 16) {
    return 'afternoon';
  } else {
    return 'night';
  }
}
