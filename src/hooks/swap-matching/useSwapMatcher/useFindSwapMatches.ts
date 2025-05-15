import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { findMatches } from '../operations/findMatches';

/**
 * Hook for finding potential swap matches between users
 */
export const useFindSwapMatches = () => {
  const [matchResults, setMatchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestInProgressRef = useRef<boolean>(false);

  /**
   * Find potential matches for swap requests
   * This function is updated to accept a data object from fetchAllData
   */
  const findSwapMatches = async (data: any, userId?: string, forceCheck: boolean = false) => {
    try {
      // Prevent multiple concurrent calls
      if (isLoading || requestInProgressRef.current) {
        console.log('Already loading matches, skipping duplicate call');
        return { success: false, message: 'Operation already in progress' };
      }
      
      setIsLoading(true);
      requestInProgressRef.current = true;
      
      console.log('Finding swap matches with data', data);
      
      // If we have all the necessary data elements, use the findMatches function
      if (data.allRequests && data.allShifts && data.preferredDates && data.profilesMap) {
        const matches = findMatches(
          data.allRequests,
          data.allShifts,
          data.preferredDates,
          data.profilesMap,
          userId,
          forceCheck
        );
        
        console.log(`Found ${matches.length} potential matches`);
        setMatchResults(matches);
        return matches;
      } else {
        // Otherwise, revert to the previous implementation using userId
        if (!userId) {
          console.error('No user ID provided and no complete data object available');
          return { success: false, message: 'Missing required parameters' };
        }
        
        console.log(`Finding swap matches for ${userId} (force: ${forceCheck})`);
        
        // Make direct call to the edge function to avoid RLS recursion
        const { data: matchData, error } = await supabase.functions.invoke('get_user_matches', {
          body: { 
            user_id: userId,
            force_check: forceCheck,
            user_perspective_only: true,
            user_initiator_only: true,
            bypass_rls: true // Explicitly request RLS bypass
          }
        });
        
        if (error) {
          console.error('Error finding matches:', error);
          return { success: false, error: error.message };
        }
        
        console.log('Found matches:', matchData);
        setMatchResults(matchData);
        
        return { success: true, matches: matchData };
      }
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
