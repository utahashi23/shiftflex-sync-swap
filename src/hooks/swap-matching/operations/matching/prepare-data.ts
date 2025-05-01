/**
 * Prepare data structures for efficient matching
 */
export const prepareMatchingData = (
  allRequests: any[], 
  allShifts: any[], 
  preferredDates: any[],
  forceCheck: boolean = false
) => {
  // Map of shifts by ID for quick lookup
  const shiftsById = allShifts.reduce((map, shift) => {
    map[shift.id] = shift;
    return map;
  }, {} as Record<string, any>);
  
  // Group the preferred dates by request ID
  const preferredDatesByRequest = preferredDates.reduce((map, date) => {
    if (!map[date.request_id]) {
      map[date.request_id] = [];
    }
    map[date.request_id].push(date);
    return map;
  }, {} as Record<string, any[]>);
  
  // Get shifts for each request
  const requestShifts = allRequests.reduce((map, request) => {
    map[request.id] = shiftsById[request.requester_shift_id];
    return map;
  }, {} as Record<string, any>);
  
  // Group shifts by user ID for checking conflicts
  const shiftsByUser = allShifts.reduce((map, shift) => {
    if (!map[shift.user_id]) {
      map[shift.user_id] = [];
    }
    map[shift.user_id].push(shift.id);
    return map;
  }, {} as Record<string, string[]>);
  
  // Filter requests to only include those with status 'pending' or include 'matched' if forceCheck is true
  const pendingRequests = allRequests.filter(request => {
    // If forceCheck is true, include both pending and matched requests
    if (forceCheck) {
      return (request.status === 'pending' || request.status === 'matched') && 
             preferredDatesByRequest[request.id] && 
             preferredDatesByRequest[request.id].length > 0;
    }
    // Otherwise, only include pending requests
    return request.status === 'pending' && 
           preferredDatesByRequest[request.id] && 
           preferredDatesByRequest[request.id].length > 0;
  });
  
  console.log(`Filtered ${pendingRequests.length} pending requests with preferred dates`);
  
  return {
    pendingRequests,
    requestShifts,
    preferredDatesByRequest,
    shiftsByUser
  };
};

/**
 * Get the shift for a swap request
 */
export const getRequestShift = (request: any, requestShifts: Record<string, any>) => {
  return requestShifts[request.id];
};
