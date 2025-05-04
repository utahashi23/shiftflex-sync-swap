
import { createLookupMaps, getShiftType } from '@/utils/shiftUtils';

/**
 * Prepares data structures for efficient matching
 */
export const prepareMatchingData = (allRequests: any[], allShifts: any[], preferredDates: any[]) => {
  // Prepare data structures for efficient matching
  const { 
    shiftsByDate, 
    shiftsByUser, 
    requestsByUser, 
    requestShifts, 
    preferredDatesByRequest 
  } = createLookupMaps(allRequests, allShifts, preferredDates);
  
  console.log('Data structures prepared for matching');
  
  // Filter for pending requests only with preferred dates
  const pendingRequests = allRequests.filter(req => 
    req.status === 'pending' && req.preferred_dates_count > 0
  );
  
  console.log(`Processing ${pendingRequests.length} pending requests with preferred dates`);
  
  return { 
    pendingRequests,
    shiftsByDate, 
    shiftsByUser, 
    requestsByUser, 
    requestShifts, 
    preferredDatesByRequest 
  };
};

/**
 * Retrieves shift data for a request, handling embedded shifts
 */
export const getRequestShift = (request: any, requestShifts: Record<string, any>) => {
  if (request._embedded_shift) {
    // Use the embedded shift data directly
    return {
      ...request._embedded_shift,
      normalizedDate: new Date(request._embedded_shift.date).toISOString().split('T')[0],
      type: getShiftType(request._embedded_shift.start_time)
    };
  } else {
    // Fall back to the lookup method
    return requestShifts[request.id];
  }
};
