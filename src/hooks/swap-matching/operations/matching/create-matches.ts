
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
  profilesMap: Record<string, any>,
  currentUserId?: string // Add currentUserId parameter
): MatchEntry[] => {
  // Temporary storage for matches
  const matches: MatchEntry[] = [];
  
  console.log(`Starting to process ${pendingRequests.length} pending requests for potential matches...`);
  
  // If currentUserId is provided, prioritize that user's requests
  // This ensures matching works properly for non-admin users
  const userRequests = currentUserId 
    ? pendingRequests.filter(req => req.requester_id === currentUserId)
    : pendingRequests;
  
  const otherUserRequests = currentUserId
    ? pendingRequests.filter(req => req.requester_id !== currentUserId) 
    : [];
  
  if (currentUserId) {
    console.log(`Focusing on ${userRequests.length} requests from current user and ${otherUserRequests.length} requests from other users`);
  }
  
  // The requests we'll process first (either all requests for admin or just current user's requests)
  const requestsToProcess = currentUserId ? userRequests : pendingRequests;
  
  // Process each request to find potential matches
  for (const request of requestsToProcess) {
    // Get the shift for this request
    const requestShift = getRequestShift(request, requestShifts);
    
    if (!requestShift) {
      console.log(`Missing shift data for request ${request.id}, skipping`);
      continue;
    }
    
    const requesterName = profilesMap[request.requester_id] ? 
      `${profilesMap[request.requester_id].first_name} ${profilesMap[request.requester_id].last_name}` : 
      'Unknown User';
    
    console.log(`Processing request from ${requesterName} (ID: ${request.id.substring(0, 6)})`);
    
    // For non-admin users, only compare against other users' requests
    // For admins, compare against all other requests
    const requestsToCompare = currentUserId
      ? (request.requester_id === currentUserId ? otherUserRequests : userRequests)
      : pendingRequests;
    
    // Loop through comparison requests
    for (const otherRequest of requestsToCompare) {
      // Skip comparing the request with itself
      if (request.id === otherRequest.id || request.requester_id === otherRequest.requester_id) {
        continue; // Skip both same request and requests from the same user
      }
      
      // Get the shift for the other request
      const otherRequestShift = getRequestShift(otherRequest, requestShifts);
      
      if (!otherRequestShift) {
        console.log(`Missing shift data for request ${otherRequest.id}, skipping comparison`);
        continue;
      }
      
      const otherRequesterName = profilesMap[otherRequest.requester_id] ? 
        `${profilesMap[otherRequest.requester_id].first_name} ${profilesMap[otherRequest.requester_id].last_name}` : 
        'Unknown User';
      
      console.log(`Comparing with request from ${otherRequesterName} (ID: ${otherRequest.id.substring(0, 6)})`);
      
      // Check if the requests are compatible
      const compatibility = checkMatchCompatibility(
        request,
        requestShift,
        otherRequest,
        otherRequestShift,
        preferredDatesByRequest,
        shiftsByUser
      );
      
      // Log the match info with enhanced details
      logMatchInfo(
        request, 
        otherRequest, 
        requestShift, 
        otherRequestShift, 
        compatibility.isCompatible, 
        compatibility.reason
      );
      
      // If match found, record it
      if (compatibility.isCompatible) {
        console.log(`✓ MATCH FOUND between ${requesterName} and ${otherRequesterName}!`);
        matches.push({ request, otherRequest });
      }
    }
  }
  
  console.log(`Matching complete. Found ${matches.length} potential matches.`);
  return matches;
};
