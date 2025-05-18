
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for finding swap matches
 */
export const useFindSwapMatches = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const findSwapMatches = useCallback(async (
    userId: string,
    forceCheck: boolean = false,
    verbose: boolean = false
  ) => {
    setIsLoading(true);
    
    try {
      // Call the edge function to find matches
      const { data, error } = await supabase.functions.invoke('get_user_matches', {
        body: {
          user_id: userId,
          bypass_rls: true,
          verbose: verbose,
          user_initiator_only: false,
          force_check: forceCheck
        }
      });
      
      if (error) {
        console.error('Error finding matches:', error);
        throw new Error(error.message || 'Failed to fetch matches');
      }
      
      if (!data || !data.matches) {
        return [];
      }
      
      return data.matches;
    } catch (error: any) {
      console.error('Error in findSwapMatches:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    findSwapMatches,
    isLoading
  };
};
