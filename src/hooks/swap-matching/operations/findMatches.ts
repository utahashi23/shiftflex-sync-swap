
import { createMatches, prepareMatchingData } from './matching';

/**
 * Find potential matches among requests
 * @param allRequests All swap requests
 * @param allShifts All shifts
 * @param preferredDates All preferred dates
 * @param profilesMap User profiles map
 * @param currentUserId Current user ID (optional)
 * @param forceCheck Force checking for matches even if already matched
 */
export const findMatches = (
  allRequests: any[], 
  allShifts: any[], 
  preferredDates: any[], 
  profilesMap: Record<string, any>,
  currentUserId?: string,
  forceCheck: boolean = false
) => {
  // Prepare data structures for efficient matching
  const { 
    pendingRequests,
    requestShifts, 
    preferredDatesByRequest,
    shiftsByUser 
  } = prepareMatchingData(allRequests, allShifts, preferredDates, forceCheck);
  
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
    profilesMap,
    currentUserId,
    forceCheck
  );
};
