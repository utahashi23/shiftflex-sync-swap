
import { checkSwapCompatibility } from '@/utils/swap-matching';

/**
 * Find potential matches among swap requests
 * @param allRequests All pending swap requests
 * @param allShifts All shifts related to the requests
 * @param preferredDates All preferred dates for the requests
 * @param profilesMap Map of user profiles
 * @param userId Optional user ID to filter requests (for non-admin users)
 * @param forceCheck Optional flag to check for matches even if already matched
 * @param verbose Optional flag to enable verbose logging
 */
export const findMatches = (
  allRequests: any[],
  allShifts: any[],
  preferredDates: any[],
  profilesMap: Record<string, any>,
  userId?: string,
  forceCheck: boolean = false,
  verbose: boolean = false
) => {
  console.log('Finding matches among', allRequests.length, 'requests');
  console.log('Force check mode:', forceCheck);
  console.log('Verbose logging mode:', verbose);
  
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
  
  // Group preferred dates by request and include accepted_types
  preferredDates.forEach(date => {
    if (!preferredDatesByRequest[date.request_id]) {
      preferredDatesByRequest[date.request_id] = [];
    }
    
    // Ensure accepted_types is properly included
    preferredDatesByRequest[date.request_id].push({
      date: date.date,
      accepted_types: date.accepted_types || []
    });
  });
  
  // For debugging
  if (verbose) {
    console.log(`Mapped ${Object.keys(shiftsByUser).length} users with shifts`);
    console.log(`Mapped ${Object.keys(preferredDatesByRequest).length} requests with preferred dates`);
    console.log('Sample shift mapping:', Array.from(shiftMap.entries())[0]);
    console.log('Sample shiftsByUser mapping:', Object.entries(shiftsByUser)[0]);
    console.log('Sample preferredDatesByRequest mapping:', Object.entries(preferredDatesByRequest)[0]);
    
    // Log a sample preferred date with accepted_types for debugging
    const sampleRequest = Object.keys(preferredDatesByRequest)[0];
    if (sampleRequest && preferredDatesByRequest[sampleRequest].length > 0) {
      console.log('Sample preferred date with accepted_types:', preferredDatesByRequest[sampleRequest][0]);
    }
  } else {
    console.log(`Mapped ${Object.keys(shiftsByUser).length} users with shifts`);
    console.log(`Mapped ${Object.keys(preferredDatesByRequest).length} requests with preferred dates`);
  }
  
  const matches = [];
  const checkedPairs = new Set();

  // Filter requests to those with preferred dates
  const validRequests = allRequests.filter(req => {
    const hasPreferredDates = preferredDatesByRequest[req.id] && 
                              preferredDatesByRequest[req.id].length > 0;
    
    // When force checking, include matched requests too
    const validStatus = forceCheck ? 
      (req.status === 'pending' || req.status === 'matched') : 
      req.status === 'pending';
    
    return hasPreferredDates && validStatus;
  });
  
  console.log(`Found ${validRequests.length} valid requests with preferred dates`);
  
  // If userId is provided, split requests into user's and others'
  const myRequests = userId 
    ? validRequests.filter(req => req.requester_id === userId)
    : validRequests;
    
  const otherRequests = userId
    ? validRequests.filter(req => req.requester_id !== userId)
    : validRequests;
  
  console.log(`User ${userId || 'admin'} has ${myRequests.length} requests, other users have ${otherRequests.length} requests`);
  
  // For admin or when no userId is provided, compare all requests with each other
  if (!userId) {
    for (let i = 0; i < validRequests.length; i++) {
      for (let j = i + 1; j < validRequests.length; j++) {
        const request1 = validRequests[i];
        const request2 = validRequests[j];
        
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
    
    if (verbose) {
      console.log(`Checking compatibility between requests ${request1.id} and ${request2.id}`);
      console.log(`  Request 1 shift: ${shift1.date}, ${shift1.start_time} - ${shift1.end_time}, type: ${shift1.type}`);
      console.log(`  Request 2 shift: ${shift2.date}, ${shift2.start_time} - ${shift2.end_time}, type: ${shift2.type}`);
      
      // Log preferred dates with accepted types for debugging
      if (preferredDatesByRequest[request1.id]) {
        console.log(`  Request 1 preferred dates:`, preferredDatesByRequest[request1.id].map(pd => 
          `${pd.date} (types: ${pd.accepted_types.join(', ') || 'any'})`
        ));
      }
      
      if (preferredDatesByRequest[request2.id]) {
        console.log(`  Request 2 preferred dates:`, preferredDatesByRequest[request2.id].map(pd => 
          `${pd.date} (types: ${pd.accepted_types.join(', ') || 'any'})`
        ));
      }
    } else if (Math.random() < 0.1) { // Only log some checks to avoid console spam
      console.log(`Checking compatibility between requests ${request1.id.substring(0,6)} and ${request2.id.substring(0,6)}`);
    }
    
    // Check if the shifts are compatible for swapping
    const { isCompatible, reason } = checkSwapCompatibility(
      request1, 
      request2,
      shift1,
      shift2,
      preferredDatesByRequest,
      shiftsByUser
    );
    
    if (isCompatible) {
      console.log(`✓ COMPATIBLE MATCH: ${request1.id.substring(0,6)} <-> ${request2.id.substring(0,6)}`);
      if (verbose) {
        console.log(`  Match details: ${shift1.date} <-> ${shift2.date}`);
        console.log(`  Shift types: ${shift1.type} <-> ${shift2.type}`);
      }
      matches.push({
        request: request1,
        otherRequest: request2
      });
    } else if (verbose) {
      console.log(`✗ INCOMPATIBLE: ${request1.id.substring(0,6)} <-> ${request2.id.substring(0,6)} (${reason || 'unknown reason'})`);
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
