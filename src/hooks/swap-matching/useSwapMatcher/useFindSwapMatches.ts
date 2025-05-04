
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for finding potential swap matches between users
 * Modified to avoid RLS recursion issues
 */
export const useFindSwapMatches = (setIsProcessing: (isProcessing: boolean) => void) => {
  const [matchResults, setMatchResults] = useState<any>(null);

  /**
   * Find potential matches for swap requests
   * @param userId - User ID to find matches for
   * @param forceCheck - Whether to check all requests even if already matched
   * @param verbose - Whether to enable verbose logging
   * @param specificCheck - Whether to check specific user IDs mentioned in issues
   */
  const findSwapMatches = async (
    userId: string, 
    forceCheck: boolean = false,
    verbose: boolean = false,
    specificCheck: boolean = false
  ) => {
    try {
      console.log(`Finding swap matches for ${userId} (force: ${forceCheck}, verbose: ${verbose}, specific: ${specificCheck})`);
      setIsProcessing(true);
      
      // Make direct call to the edge function to avoid RLS recursion
      const { data, error } = await supabase.functions.invoke('get_user_matches', {
        body: { 
          user_id: userId,
          force_check: forceCheck,
          verbose: verbose,
          specific_check: specificCheck
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
      setIsProcessing(false);
    }
  };

  return {
    findSwapMatches,
    matchResults
  };
};
