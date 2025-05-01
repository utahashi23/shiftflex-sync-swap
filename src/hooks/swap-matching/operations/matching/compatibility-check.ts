
/**
 * Check if two swap requests are compatible
 */
export const checkMatchCompatibility = (
  request: any,
  requestShift: any,
  otherRequest: any,
  otherRequestShift: any,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>
): { isCompatible: boolean; reason?: string; matchDate?: string } => {
  // Cannot match with self
  if (request.requester_id === otherRequest.requester_id) {
    return { isCompatible: false, reason: 'Cannot match with self' };
  }
  
  // Both requests must have preferred dates
  const preferredDates = preferredDatesByRequest[request.id] || [];
  const otherPreferredDates = preferredDatesByRequest[otherRequest.id] || [];
  
  if (preferredDates.length === 0 || otherPreferredDates.length === 0) {
    return { isCompatible: false, reason: 'Missing preferred dates' };
  }
  
  // Users must not be working on each other's preferred dates
  const userShiftDates = shiftsByUser[otherRequest.requester_id] || [];
  const otherUserShiftDates = shiftsByUser[request.requester_id] || [];
  
  // Check if any of my preferred dates match the other user's shift dates
  let matchDate = null;
  
  for (const prefDate of preferredDates) {
    // Each user must be available on the other's preferred date
    if (!otherUserShiftDates.includes(prefDate.date)) {
      continue; // Other user doesn't work on this day
    }
    
    // Check if the preferred date's shift types match
    if (prefDate.acceptedTypes && prefDate.acceptedTypes.includes(otherRequestShift.type)) {
      matchDate = prefDate.date;
      break;
    }
  }
  
  if (!matchDate) {
    return { isCompatible: false, reason: 'No matching date with compatible shift types' };
  }
  
  // Verify reverse compatibility
  let reverseMatch = false;
  for (const otherPrefDate of otherPreferredDates) {
    // Check if other user's preferred date contains my shift
    if (otherPrefDate.date === requestShift.normalizedDate && 
        otherPrefDate.acceptedTypes && 
        otherPrefDate.acceptedTypes.includes(requestShift.type)) {
      reverseMatch = true;
      break;
    }
  }
  
  if (!reverseMatch) {
    return { 
      isCompatible: false, 
      reason: 'One-way match only - other user not interested in my shift type'
    };
  }
  
  return { isCompatible: true, matchDate };
};

/**
 * Log match information for debugging
 */
export const logMatchInfo = (
  request: any,
  otherRequest: any, 
  myShift: any,
  theirShift: any,
  isMatch: boolean,
  reason?: string
) => {
  if (isMatch) {
    console.log(`✅ MATCH FOUND: ${request.requester_id.substring(0, 6)} <-> ${otherRequest.requester_id.substring(0, 6)}`);
    console.log(`  My shift: ${myShift?.normalizedDate || myShift?.date} (${myShift?.type}) <-> Their shift: ${theirShift?.normalizedDate || theirShift?.date} (${theirShift?.type})`);
  } else {
    console.log(`❌ NO MATCH: ${request.requester_id.substring(0, 6)} <-> ${otherRequest.requester_id.substring(0, 6)}`);
    console.log(`  Reason: ${reason}`);
  }
};
