
import { createMatches, prepareMatchingData } from './matching';

/**
 * Find potential matches among requests
 */
export const findMatches = (allRequests: any[], allShifts: any[], preferredDates: any[], profilesMap: Record<string, any>) => {
  // Prepare data structures for efficient matching
  const { 
    pendingRequests,
    requestShifts, 
    preferredDatesByRequest,
    shiftsByUser 
  } = prepareMatchingData(allRequests, allShifts, preferredDates);
  
  if (pendingRequests.length === 0) {
    console.log('No pending requests with preferred dates to process');
    return [];
  }
  
  // Create matches from the prepared data
  return createMatches(
    pendingRequests,
    requestShifts,
    preferredDatesByRequest,
    shiftsByUser,
    profilesMap
  );
};
