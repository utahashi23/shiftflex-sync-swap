
import { normalizeDate } from '@/utils/dateUtils';

/**
 * Checks if two requests represent a mutual date swap
 * This implements the core logic for:
 * - User A is rostered to work on Date A and requests a swap for Date B
 * - User B is rostered to work on Date B and requests a swap for Date A
 *
 * @param request1 The first swap request
 * @param request2 The second swap request  
 * @param shifts Map of all shifts indexed by ID
 * @param preferredDates Map of all preferred dates by request ID
 * @returns Boolean indicating if this is a mutual date swap match
 */
export const isMutualDateSwap = (
  request1: any,
  request2: any,
  shifts: Record<string, any>,
  preferredDates: Record<string, any[]>
): boolean => {
  // Get the shifts for both requests
  const shift1 = shifts[request1.requester_shift_id];
  const shift2 = shifts[request2.requester_shift_id];
  
  if (!shift1 || !shift2) {
    console.log("Missing shift data for mutual swap check");
    return false;
  }
  
  // Normalize dates for consistent comparison
  const shift1Date = normalizeDate(shift1.date);
  const shift2Date = normalizeDate(shift2.date);
  
  // Get preferred dates for both users
  const request1PreferredDates = preferredDates[request1.id] || [];
  const request2PreferredDates = preferredDates[request2.id] || [];
  
  console.log(`Checking mutual date swap:
    User 1 (${request1.requester_id.substring(0,6)}) works on ${shift1Date}
    User 2 (${request2.requester_id.substring(0,6)}) works on ${shift2Date}
  `);
  
  // Check if User 1 wants User 2's date
  const user1WantsUser2Date = request1PreferredDates.some(pd => 
    normalizeDate(pd.date) === shift2Date
  );
  
  // Check if User 2 wants User 1's date  
  const user2WantsUser1Date = request2PreferredDates.some(pd =>
    normalizeDate(pd.date) === shift1Date
  );
  
  // It's a mutual swap match if both users want each other's dates
  const isMatch = user1WantsUser2Date && user2WantsUser1Date;
  
  if (isMatch) {
    console.log(`✓ MUTUAL DATE SWAP MATCH: 
      User ${request1.requester_id.substring(0,6)} wants ${shift2Date}
      User ${request2.requester_id.substring(0,6)} wants ${shift1Date}
    `);
  }
  
  return isMatch;
};

/**
 * Helper function to find mutual date swaps among a set of requests
 * @param requests Array of swap requests to check
 * @param shifts Map of all shifts indexed by ID
 * @param preferredDates Map of all preferred dates by request ID
 * @returns Array of matched request pairs
 */
export const findMutualDateSwaps = (
  requests: any[],
  shifts: Record<string, any>,
  preferredDates: Record<string, any[]>
): {request1: any, request2: any}[] => {
  const matches = [];
  const processedRequestIds = new Set();
  
  // Check each pair of requests for potential matches
  for (let i = 0; i < requests.length; i++) {
    const request1 = requests[i];
    
    // Skip if this request was already matched
    if (processedRequestIds.has(request1.id)) continue;
    
    for (let j = i + 1; j < requests.length; j++) {
      const request2 = requests[j];
      
      // Skip if second request was already matched or is from the same user
      if (processedRequestIds.has(request2.id) || 
          request1.requester_id === request2.requester_id) continue;
      
      // Check if this pair is a mutual date swap
      if (isMutualDateSwap(request1, request2, shifts, preferredDates)) {
        matches.push({ request1, request2 });
        processedRequestIds.add(request1.id);
        processedRequestIds.add(request2.id);
        break; // Move to the next unmatched request
      }
    }
  }
  
  return matches;
};
