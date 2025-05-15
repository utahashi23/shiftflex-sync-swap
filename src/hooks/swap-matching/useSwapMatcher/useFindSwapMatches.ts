
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
      const matchResults = findMatches({
        requests: allRequests,
        shifts: allShifts,
        preferredDates: preferredDates,
      });
      
      // Process and store matches
      const processResponse = await processMatches(
        matchResults, 
        allRequests,
        preferredDates,
        profilesMap
      );
      
      // Return the results
      return {
        success: true,
        matches: processResponse.matches,
        results: matchResults,
        message: `Found ${processResponse.matches.length} potential matches`,
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
