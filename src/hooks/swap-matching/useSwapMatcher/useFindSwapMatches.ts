
import { useCallback } from 'react';
import { findMatches } from '../operations/findMatches';
import { processMatches } from '../operations/processMatches';

export function useFindSwapMatches() {
  // Updated function signature to accept data object and progress message
  const findSwapMatches = useCallback(async (data: any, progressMessage: string) => {
    try {
      // Extract data from the passed object
      const { allRequests, allShifts, preferredDates, profilesMap } = data;
      
      // Find potential matches
      const matchResults = findMatches(
        allRequests,
        allShifts,
        preferredDates,
        profilesMap
      );
      
      // Process and store matches
      // Note: processMatches expects the user ID as the second parameter
      const userId = data?.user?.id || '';
      const processResponse = await processMatches(matchResults, userId);
      
      // Return the results
      return {
        success: true,
        matches: processResponse || [],
        results: matchResults,
        message: `Found ${processResponse?.length || 0} potential matches`,
      };
    } catch (error: any) {
      console.error('Error in findSwapMatches:', error);
      return { 
        success: false, 
        message: `Error finding matches: ${error.message}` 
      };
    }
  }, []);
  
  return { findSwapMatches };
}
