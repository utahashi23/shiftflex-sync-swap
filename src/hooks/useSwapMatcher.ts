
import { useSwapMatchingState } from './swap-matching/useSwapMatchingState';
import { createLookupMaps } from '@/utils/shiftUtils';
import { checkSwapCompatibility, recordShiftMatch } from '@/utils/swapMatchingLogic';

export const useSwapMatcher = () => {
  const {
    isProcessing,
    handleSwapMatchingStart,
    handleSwapMatchingComplete,
    handleSwapMatchingError,
    userId
  } = useSwapMatchingState();

  /**
   * Find all potential matches between all pending swap requests
   */
  const findSwapMatches = async () => {
    try {
      // Start the matching process and get all required data
      const matchingData = await handleSwapMatchingStart();
      if (!matchingData) return;
      
      const { allRequests, allShifts, preferredDates, profilesMap } = matchingData;
      
      // Create lookup maps for more efficient matching
      const {
        shiftsByDate,
        shiftsByUser,
        requestsByUser,
        requestShifts,
        preferredDatesByRequest
      } = createLookupMaps(allRequests, allShifts, preferredDates);
      
      console.log('Data structures prepared for matching');
      
      // Perform the matching
      let matchesFound = 0;
      const processedPairs = new Set(); // To avoid duplicate matches
      
      console.log('Starting to process each request for potential matches...');
      
      for (const request of allRequests) {
        // Get the request's shift details
        const requestShift = requestShifts[request.id];
        if (!requestShift) {
          console.warn(`Missing shift data for request ${request.id}`);
          continue;
        }
        
        // Get the requester's profile
        const requesterProfile = profilesMap[request.requester_id];
        console.log(`Processing request ${request.id} from user ${request.requester_id}`, requesterProfile ? `(${requesterProfile.first_name} ${requesterProfile.last_name})` : '');
        
        // Get preferred dates for this request
        const prefDates = preferredDatesByRequest[request.id] || [];
        if (prefDates.length === 0) {
          console.warn(`No preferred dates for request ${request.id}`);
          continue;
        }
        
        console.log(`Request ${request.id} has ${prefDates.length} preferred dates`);
        console.log(`Offering shift on ${requestShift.normalizedDate} (${requestShift.type})`);
        
        // For each other request, check if there's a potential match
        for (const otherRequest of allRequests) {
          // Skip if it's the same request
          if (otherRequest.id === request.id) continue;
          
          // Create a unique pair ID to avoid duplicate matches
          const pairId = [request.id, otherRequest.id].sort().join('-');
          if (processedPairs.has(pairId)) {
            continue;
          }
          processedPairs.add(pairId);
          
          // Get the other request's shift details
          const otherRequestShift = requestShifts[otherRequest.id];
          if (!otherRequestShift) {
            console.warn(`Missing shift data for other request ${otherRequest.id}`);
            continue;
          }
          
          // Get the other requester's profile
          const otherRequesterProfile = profilesMap[otherRequest.requester_id];
          console.log(`Checking against request ${otherRequest.id} from user ${otherRequest.requester_id}`, otherRequesterProfile ? `(${otherRequesterProfile.first_name} ${otherRequesterProfile.last_name})` : '');
          
          // Get preferred dates for the other request
          const otherPrefDates = preferredDatesByRequest[otherRequest.id] || [];
          if (otherPrefDates.length === 0) {
            console.warn(`No preferred dates for other request ${otherRequest.id}`);
            continue;
          }
          
          // Check if these requests are compatible for a swap
          const { isCompatible } = checkSwapCompatibility(
            request,
            otherRequest,
            requestShift,
            otherRequestShift,
            preferredDatesByRequest,
            shiftsByUser
          );
          
          if (!isCompatible) continue;
          
          // Record the match in the database
          const { success } = await recordShiftMatch(request, otherRequest, userId || '');
          
          if (success) {
            matchesFound++;
            // Only find one match per request
            break;
          }
        }
      }
      
      handleSwapMatchingComplete(matchesFound);
      
    } catch (error: any) {
      handleSwapMatchingError(error);
    }
  };

  return {
    findSwapMatches,
    isProcessing
  };
};
