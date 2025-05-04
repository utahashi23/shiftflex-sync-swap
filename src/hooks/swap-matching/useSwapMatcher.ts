
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFindSwapMatches } from './useSwapMatcher/useFindSwapMatches';
import { useProcessState } from './useSwapMatcher/useProcessState';

/**
 * Hook for finding and processing swap matches
 */
export const useSwapMatcher = () => {
  const { user } = useAuth();
  const { isProcessing, setIsProcessing } = useProcessState();
  const { findSwapMatches: executeFindMatches } = useFindSwapMatches(setIsProcessing);
  
  /**
   * Find potential matches for a user's swap requests
   * @param userId - The ID of the current user (optional for admins)
   */
  const findSwapMatches = async (userId?: string) => {
    if (!user && !userId) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    await executeFindMatches(userId || user?.id);
  };

  return {
    findSwapMatches,
    isProcessing
  };
};
