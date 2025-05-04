
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
   * @param userPerspectiveOnly - Whether to only show matches from the user's perspective
   * @param userInitiatorOnly - Whether to only show matches where the user is the initiator
   */
  const findSwapMatches = async (
    userId?: string, 
    forceCheck: boolean = false, 
    verbose: boolean = true,
    userPerspectiveOnly: boolean = true,
    userInitiatorOnly: boolean = true
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
      console.log(`Finding swap matches for user: ${userId || user?.id}, force check: ${forceCheck}, verbose: ${verbose}, user perspective only: ${userPerspectiveOnly}, user initiator only: ${userInitiatorOnly}`);
      
      // Use service-role based approach to bypass RLS issues
      console.log("Using modified approach to avoid RLS recursion...");
      try {
        const result = await executeFindMatches(
          userId || user?.id, 
          forceCheck, 
          verbose, 
          userPerspectiveOnly,
          userInitiatorOnly
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
