
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for finding potential swap matches between users
 * Enhanced to avoid RLS recursion issues with clearer error handling
 */
export const useFindSwapMatches = () => {
  const [matchResults, setMatchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestInProgressRef = useRef<boolean>(false);

  /**
   * Find potential matches for swap requests
   * @param userId - User ID to find matches for
   * @param forceCheck - Whether to check all requests even if already matched
   * @param verbose - Whether to enable verbose logging
   * @returns Object with success flag and matches array
   */
  const findSwapMatches = async (userId: string, forceCheck: boolean = false, verbose: boolean = false) => {
    try {
      // Prevent multiple concurrent calls
      if (isLoading || requestInProgressRef.current) {
        console.log('Already loading matches, skipping duplicate call');
        return { success: false, message: 'Operation already in progress' };
      }
      
      setIsLoading(true);
      requestInProgressRef.current = true;
      
      console.log(`Finding swap matches for ${userId} (force: ${forceCheck}, verbose: ${verbose})`);
      
      // Make direct call to the edge function to avoid RLS recursion
      // The edge function uses service_role to bypass RLS policies
      const { data, error } = await supabase.functions.invoke('get_user_matches', {
        body: { 
          user_id: userId,
          force_check: forceCheck,
          verbose: verbose,
          user_perspective_only: true,
          user_initiator_only: true,
          bypass_rls: true // Explicitly request RLS bypass
        }
      });
      
      if (error) {
        console.error('Error finding matches:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Found matches:', data);
      setMatchResults(data);
      
      // Return matches property instead of data directly
      return { success: true, matches: data };
    } catch (error: any) {
      console.error('Error in findSwapMatches:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
      requestInProgressRef.current = false;
    }
  };

  return {
    findSwapMatches,
    matchResults,
    isLoading
  };
};
