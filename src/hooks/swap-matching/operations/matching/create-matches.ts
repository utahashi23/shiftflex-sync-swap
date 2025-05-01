
import { getRequestShift } from './prepare-data';
import { checkMatchCompatibility, logMatchInfo } from './compatibility-check';
import { MatchEntry } from './types';

/**
 * Process each request to find potential matches
 */
export const createMatches = (
  pendingRequests: any[],
  requestShifts: Record<string, any>,
  preferredDatesByRequest: Record<string, any[]>,
  shiftsByUser: Record<string, string[]>,
  profilesMap: Record<string, any>
): MatchEntry[] => {
  // Temporary storage for matches
  const matches: MatchEntry[] = [];
  
  console.log(`Starting to process each request for potential matches...`);
  
  // Process each request to find potential matches
  for (const request of pendingRequests) {
    // Get the shift for this request
    const requestShift = getRequestShift(request, requestShifts);
    
    if (!requestShift) {
      console.log(`Missing shift data for request ${request.id}`);
      continue;
    }
    
    const requesterName = profilesMap[request.requester_id] ? 
      `${profilesMap[request.requester_id].first_name} ${profilesMap[request.requester_id].last_name}` : 
      'Unknown User';
    
    logMatchInfo(requesterName, request, requestShift);
    
    // Loop through all other pending requests to check for compatibility
    for (const otherRequest of pendingRequests) {
      // Get the shift for the other request
      const otherRequestShift = getRequestShift(otherRequest, requestShifts);
      
      const isCompatible = checkMatchCompatibility(
        request,
        otherRequest,
        requestShift,
        otherRequestShift,
        preferredDatesByRequest,
        shiftsByUser
      );
      
      // If match found, record it
      if (isCompatible) {
        matches.push({ request, otherRequest });
      }
    }
  }
  
  console.log(`Matching complete. Found ${matches.length} matches.`);
  return matches;
};
