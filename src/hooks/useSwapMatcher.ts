
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; 
import { normalizeDate } from '@/utils/dateUtils';
import { getShiftType, createLookupMaps } from '@/utils/shiftUtils';
import { checkSwapCompatibility, recordShiftMatch, fetchSwapMatchingData } from '@/utils/swapMatchingLogic';

export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  
  // Function to find and record swap matches
  const findSwapMatches = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the swap matching feature.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('----------- SWAP MATCHING STARTED -----------');
      console.log('Current user ID:', user.id);
      
      // Fetch all necessary data for swap matching
      const result = await fetchSwapMatchingData();
      
      if (!result.success) {
        if (result.message) {
          console.log(result.message);
          toast({
            title: "No Matches Found",
            description: result.message,
          });
        } else {
          throw result.error;
        }
        return;
      }
      
      const { allRequests, allShifts, preferredDates, profilesMap } = result.data;
      
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
      
      // Process each request to find potential matches
      for (const request of allRequests) {
        const requestShift = requestShifts[request.id];
        if (!requestShift) {
          console.log(`Missing shift data for request ${request.id}`);
          continue;
        }
        
        const requesterName = profilesMap[request.requester_id] ? 
          `${profilesMap[request.requester_id].first_name} ${profilesMap[request.requester_id].last_name}` : 
          'Unknown User';
        
        console.log(`Processing request ${request.id} from user ${request.requester_id} (${requesterName})`);
        
        // Get this request's preferred dates for swapping
        const preferredDates = preferredDatesByRequest[request.id] || [];
        console.log(`Request ${request.id} has ${preferredDates.length} preferred dates`);
        console.log(`Offering shift on ${requestShift.normalizedDate} (${requestShift.type})`);
        
        // Loop through all other requests to check for compatibility
        for (const otherRequest of allRequests) {
          // Skip self-comparison
          if (otherRequest.id === request.id) continue;
          
          // Skip if requester is the same person
          if (otherRequest.requester_id === request.requester_id) continue;
          
          // Get the shift for the other request
          const otherRequestShift = requestShifts[otherRequest.id];
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
      
      // Record all matches in the database
      for (const match of matches) {
        await recordShiftMatch(match.request, match.otherRequest, user.id);
      }
      
      if (matches.length > 0) {
        toast({
          title: `Found ${matches.length} Swap Matches!`,
          description: "Check the matched swaps tab to see your matches.",
        });
      } else {
        toast({
          title: "No Matches Found",
          description: "No compatible shift swaps were found at this time.",
        });
      }
    } catch (error) {
      console.error('Error finding swap matches:', error);
      toast({
        title: "Error Finding Matches",
        description: "There was a problem finding swap matches. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      console.log('----------- SWAP MATCHING COMPLETED -----------');
    }
  };
  
  return { findSwapMatches, isProcessing };
};
