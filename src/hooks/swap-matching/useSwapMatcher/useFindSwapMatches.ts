
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
      console.log(`Finding matches for user ${userId} (force: ${forceCheck}, verbose: ${verbose})`);
      
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
        toast({
          title: "Failed to load matches",
          description: "There was a problem finding potential matches",
          variant: "destructive"
        });
        throw new Error(error.message || 'Failed to fetch matches');
      }
      
      if (!data || !data.matches) {
        console.log("No matches found or empty response");
        return [];
      }
      
      console.log(`Found ${data.matches.length} potential matches`);
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
