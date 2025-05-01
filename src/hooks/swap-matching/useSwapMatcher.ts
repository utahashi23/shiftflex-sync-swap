
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  fetchAllData, 
  findMatches, 
  processMatches 
} from './swapMatchingOperations';

/**
 * Hook for finding and processing swap matches between users
 */
export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, isAdmin } = useAuth();
  
  /**
   * Function to find and process swap matches
   */
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
      console.log('Is admin:', isAdmin);
      
      // Step 1: Fetch all necessary data for matching
      const data = await fetchAllData();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch necessary data');
      }
      
      // Step 2: Find potential matches
      const matches = findMatches(data.allRequests, data.allShifts, data.preferredDates, data.profilesMap);
      
      // Step 3: Process and record matches
      await processMatches(matches, user.id);
      
      // Step 4: Notify the user of the results
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
    } catch (error: any) {
      console.error('Error finding swap matches:', error);
      toast({
        title: "Error Finding Matches",
        description: `Problem finding matches: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      console.log('----------- SWAP MATCHING COMPLETED -----------');
    }
  };
  
  return { findSwapMatches, isProcessing };
};
