
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
  console.log('Number of shifts:', allShifts.length);
  console.log('Number of preferred dates:', preferredDates.length);
  console.log('Force check mode:', forceCheck);
  
  // Create mappings for faster lookups
  const shiftMap = new Map();
  const shiftsByUser: Record<string, string[]> = {};
  const preferredDatesByRequest: Record<string, any[]> = {};
  
  // Map shifts by ID and group by user
  allShifts.forEach(shift => {
    // Normalize the shift data and add type
    const normalizedShift = {
      ...shift,
      normalizedDate: shift.date,
      type: determineShiftType(shift.start_time)
    };
    
    shiftMap.set(shift.id, normalizedShift);
    
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
    
    // IMPORTANT: Ensure we normalize the property name from accepted_types to acceptedTypes
    const normalizedDate = {
      date: date.date,
      acceptedTypes: date.accepted_types || []
    };
    
    preferredDatesByRequest[date.request_id].push(normalizedDate);
    
    if (verbose) {
      console.log(`Preferred date ${date.date} for request ${date.request_id} has accepted types:`, 
        Array.isArray(date.accepted_types) ? date.accepted_types.join(', ') : 'none');
    }
  });
  
  // Log some diagnostics about the data
  console.log(`Mapped ${Object.keys(shiftsByUser).length} users with shifts`);
  console.log(`Mapped ${Object.keys(preferredDatesByRequest).length} requests with preferred dates`);
  
  // If verbose, log a sample of the data
  if (verbose) {
    // Log a sample request's preferred dates
    const sampleRequestId = Object.keys(preferredDatesByRequest)[0];
    if (sampleRequestId) {
      console.log(`Sample request ${sampleRequestId} preferred dates:`,
        preferredDatesByRequest[sampleRequestId].map(pd => 
          `${pd.date} (types: ${pd.acceptedTypes?.join(', ') || 'none'})`
        )
      );
    }
    
    // Log a sample shift
    const sampleShiftId = shiftMap.keys().next().value;
    if (sampleShiftId) {
      const sampleShift = shiftMap.get(sampleShiftId);
      console.log(`Sample shift ${sampleShiftId}:`, {
        date: sampleShift.date,
        startTime: sampleShift.start_time,
        type: sampleShift.type
      });
    }
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
        checkForMatch(validRequests[i], validRequests[j]);
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
    // Skip if users are the same
    if (request1.requester_id === request2.requester_id) {
      return;
    }
    
    // Generate a unique pair ID (order doesn't matter for matching)
    const pairId = [request1.id, request2.id].sort().join('_');
    
    // Skip if this pair was already checked
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
      console.log(`\nChecking compatibility between requests ${request1.id.substring(0, 6)} and ${request2.id.substring(0, 6)}`);
      console.log(`  Request 1 shift: ${shift1.date}, ${shift1.start_time} - ${shift1.end_time}, type: ${shift1.type}`);
      console.log(`  Request 2 shift: ${shift2.date}, ${shift2.start_time} - ${shift2.end_time}, type: ${shift2.type}`);
      
      // Log preferred dates with accepted types for debugging
      if (preferredDatesByRequest[request1.id]) {
        console.log(`  Request 1 preferred dates:`, preferredDatesByRequest[request1.id].map(pd => 
          `${pd.date} (types: ${pd.acceptedTypes?.join(', ') || 'none'})`
        ));
      }
      
      if (preferredDatesByRequest[request2.id]) {
        console.log(`  Request 2 preferred dates:`, preferredDatesByRequest[request2.id].map(pd => 
          `${pd.date} (types: ${pd.acceptedTypes?.join(', ') || 'none'})`
        ));
      }
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
      console.log(`✓ COMPATIBLE MATCH: ${request1.id.substring(0, 6)} <-> ${request2.id.substring(0, 6)}`);
      
      if (verbose) {
        console.log(`  Match details: ${shift1.date} <-> ${shift2.date}`);
        console.log(`  Shift types: ${shift1.type} <-> ${shift2.type}`);
        
        // Log the matched preferred dates with their accepted types
        const req1MatchedDate = preferredDatesByRequest[request1.id]?.find(pd => pd.date === shift2.date);
        const req2MatchedDate = preferredDatesByRequest[request2.id]?.find(pd => pd.date === shift1.date);
        
        console.log(`  Request 1 accepts types for ${shift2.date}: ${req1MatchedDate?.acceptedTypes?.join(', ') || 'none'}`);
        console.log(`  Request 2 accepts types for ${shift1.date}: ${req2MatchedDate?.acceptedTypes?.join(', ') || 'none'}`);
      }
      
      matches.push({
        request: request1,
        otherRequest: request2
      });
    } else if (verbose) {
      console.log(`✗ INCOMPATIBLE: ${request1.id.substring(0, 6)} <-> ${request2.id.substring(0, 6)} (${reason || 'unknown reason'})`);
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
