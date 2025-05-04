
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
  const findSwapMatches = async (userId?: string, forceCheck: boolean = false, verbose: boolean = false) => {
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
      await executeFindMatches(userId || user?.id, forceCheck, verbose);
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
