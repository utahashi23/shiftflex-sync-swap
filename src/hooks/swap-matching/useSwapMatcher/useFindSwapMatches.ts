
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for finding potential swap matches between users
 * Enhanced to avoid RLS recursion issues with clearer error handling
 */
export const useFindSwapMatches = (setIsProcessing: (isProcessing: boolean) => void) => {
  const [matchResults, setMatchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Find potential matches for swap requests
   * @param userId - User ID to find matches for
   * @param forceCheck - Whether to check all requests even if already matched
   * @param verbose - Whether to enable verbose logging
   * @param userPerspectiveOnly - Whether to only show matches from the user's perspective
   * @param userInitiatorOnly - Whether to only show matches where the user is the initiator
   */
  const findSwapMatches = async (
    userId: string, 
    forceCheck: boolean = false,
    verbose: boolean = false,
    userPerspectiveOnly: boolean = true,
    userInitiatorOnly: boolean = true
  ) => {
    try {
      // Prevent multiple concurrent calls
      if (isLoading) {
        console.log('Already loading matches, skipping duplicate call');
        return matchResults;
      }
      
      setIsLoading(true);
      setIsProcessing(true);
      
      console.log(`Finding swap matches for ${userId} (force: ${forceCheck}, verbose: ${verbose}, user perspective only: ${userPerspectiveOnly}, user initiator only: ${userInitiatorOnly})`);
      
      // Make direct call to the edge function to avoid RLS recursion
      // The edge function uses service_role to bypass RLS policies
      const { data, error } = await supabase.functions.invoke('get_user_matches', {
        body: { 
          user_id: userId,
          force_check: forceCheck,
          verbose: verbose,
          user_perspective_only: userPerspectiveOnly,
          user_initiator_only: userInitiatorOnly,
          bypass_rls: true // Explicitly request RLS bypass
        }
      });
      
      if (error) {
        console.error('Error finding matches:', error);
        throw error;
      }
      
      console.log('Found matches:', data);
      setMatchResults(data);
      return data;
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      throw error;
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  return {
    findSwapMatches,
    matchResults,
    isLoading
  };
};
