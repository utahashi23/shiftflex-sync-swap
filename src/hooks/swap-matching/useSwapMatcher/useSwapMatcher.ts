
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFindSwapMatches } from './useFindSwapMatches';
import { useProcessingState } from './useProcessingState';

/**
 * Hook for finding and processing swap matches
 */
export const useSwapMatcher = () => {
  const { user } = useAuth();
  const { isProcessing, setIsProcessing } = useProcessingState();
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const { findSwapMatches: executeFindMatches } = useFindSwapMatches(setIsProcessing);
  
  /**
   * Find potential matches for a user's swap requests
   * @param userId - The ID of the current user (optional for admins)
   * @param forceCheck - Force checking for matches even if already matched
   * @param verbose - Whether to enable verbose logging
   */
  const findSwapMatches = async (
    userId?: string, 
    forceCheck: boolean = false, 
    verbose: boolean = true
  ) => {
    if (!user && !userId) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsFindingMatches(true);
      console.log(`Finding swap matches for user: ${userId || user?.id}, force check: ${forceCheck}, verbose: ${verbose}`);
      
      try {
        const result = await executeFindMatches(
          userId || user?.id, 
          forceCheck, 
          verbose
        );
        console.log("Edge function result:", result);
        
        // Show a toast if matches were found
        if (result && Array.isArray(result) && result.length > 0) {
          toast({
            title: "Matches found!",
            description: `Found ${result.length} potential swap matches.`,
          });
        } else {
          toast({
            title: "No matches found",
            description: "No potential swap matches were found at this time.",
          });
        }
        
        return result;
      } catch (error) {
        console.error("Error in edge function call:", error);
        throw error;
      }
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      toast({
        title: "Failed to find matches",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsFindingMatches(false);
    }
  };

  return {
    findSwapMatches,
    isProcessing,
    isFindingMatches
  };
};
