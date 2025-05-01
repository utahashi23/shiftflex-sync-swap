
import { createLookupMaps, getShiftType } from '@/utils/shiftUtils';
import { checkSwapCompatibility } from '@/utils/swap-matching';

/**
 * Find potential matches among requests
 */
export const findMatches = (allRequests: any[], allShifts: any[], preferredDates: any[], profilesMap: Record<string, any>) => {
  // Prepare data structures for efficient matching
  const { 
    shiftsByDate, 
    shiftsByUser, 
    requestsByUser, 
    requestShifts, 
    preferredDatesByRequest 
  } = createLookupMaps(allRequests, allShifts, preferredDates);
  
  console.log('Data structures prepared for matching');
  console.log('Starting to process each request for potential matches...');
  
  // Temporary storage for matches
  const matches = [];
  
  // Filter for pending requests only 
  const pendingRequests = allRequests.filter(req => req.status === 'pending' && req.preferred_dates_count > 0);
  console.log(`Processing ${pendingRequests.length} pending requests with preferred dates`);
  
  // Process each request to find potential matches
  for (const request of pendingRequests) {
    // Get the shift for this request, checking for embedded data first
    let requestShift;
    
    if (request._embedded_shift) {
      // Use the embedded shift data directly
      requestShift = {
        ...request._embedded_shift,
        normalizedDate: new Date(request._embedded_shift.date).toISOString().split('T')[0],
        type: getShiftType(request._embedded_shift.start_time)
      };
    } else {
      // Fall back to the lookup method
      requestShift = requestShifts[request.id];
    }
    
    if (!requestShift) {
      console.log(`Missing shift data for request ${request.id}`);
      continue;
    }
    
    const requesterName = profilesMap[request.requester_id] ? 
      `${profilesMap[request.requester_id].first_name} ${profilesMap[request.requester_id].last_name}` : 
      'Unknown User';
    
    console.log(`Processing request ${request.id} from user ${request.requester_id} (${requesterName})`);
    
    // Loop through all other pending requests to check for compatibility
    for (const otherRequest of pendingRequests) {
      // Skip self-comparison
      if (otherRequest.id === request.id) continue;
      
      // Skip if requester is the same person
      if (otherRequest.requester_id === request.requester_id) continue;
      
      // Get the shift for the other request, checking for embedded data first
      let otherRequestShift;
      
      if (otherRequest._embedded_shift) {
        // Use the embedded shift data directly
        otherRequestShift = {
          ...otherRequest._embedded_shift,
          normalizedDate: new Date(otherRequest._embedded_shift.date).toISOString().split('T')[0],
          type: getShiftType(otherRequest._embedded_shift.start_time)
        };
      } else {
        // Fall back to the lookup method
        otherRequestShift = requestShifts[otherRequest.id];
      }
      
      if (!otherRequestShift) {
        console.log(`Missing shift data for other request ${otherRequest.id}`);
        continue;
      }
      
      // Check if users want to swap shifts based on their preferences
      const { isCompatible } = checkSwapCompatibility(
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
