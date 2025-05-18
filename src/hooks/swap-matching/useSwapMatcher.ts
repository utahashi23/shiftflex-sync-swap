
import { useState } from 'react';
import { useSwapRequests } from '../swap-requests';
import { useFindSwapMatches } from './useFindSwapMatches';
import { useProcessState } from './useProcessState';
import { fetchAllData } from '../operations/fetchData';

export type MatchingStatus =
  | 'idle'
  | 'fetching-data'
  | 'analyzing-data'
  | 'finding-matches'
  | 'storing-matches'
  | 'complete'
  | 'error';

export function useSwapMatcher() {
  // Using only the available methods from useSwapRequests
  const { fetchSwapRequests } = useSwapRequests();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [initialFetchCompleted, setInitialFetchCompleted] = useState(false);
  const [requestInProgress, setRequestInProgress] = useState(false);

  const { 
    status,
    progress, 
    message,
    startProcessing,
    updateProgress,
    isProcessing 
  } = useProcessState();

  const { findSwapMatches } = useFindSwapMatches(setRequestInProgress);

  /**
   * Optimized function to find matches that prevents duplicate/excessive requests
   */
  const findMatches = async (userId?: string) => {
    if (requestInProgress) {
      console.log('Match finding operation already in progress, skipping');
      return;
    }
    
    setRequestInProgress(true);
    try {
      console.log('Finding potential matches for user');
      updateProgress('finding-matches', 'Finding potential matches');
      
      // Use userId if provided, otherwise expect it to be included in the findSwapMatches function
      const matchData = await findSwapMatches(
        userId || '',
        true,
        false
      );
      
      if (matchData) {
        setMatches(matchData);
        console.log(`Found ${matchData.length} potential matches`);
        updateProgress('complete', `Found ${matchData.length} potential matches`);
      } else {
        console.log('No matches found or empty response received');
        setMatches([]);
        updateProgress('complete', 'No matches found');
      }
      
      return { 
        success: true, 
        matches: matchData || [] 
      };
    } catch (error: any) {
      console.error('Error finding matches:', error);
      setError(error.message);
      updateProgress('error', error.message);
      return { 
        success: false, 
        message: error.message, 
        matches: [] 
      };
    } finally {
      setRequestInProgress(false);
    }
  };

  /**
   * Run the matcher with proper request throttling
   */
  const runMatcher = async () => {
    if (isRunning || requestInProgress) {
      console.log('Matcher is already running, skipping duplicate request');
      return;
    }
    
    setIsRunning(true);
    setError(null);
    setMatches([]);
    setMatchResults([]);
    
    try {
      startProcessing('fetching-data');
      const dataResponse = await fetchAllData();
      
      if (!dataResponse.success) {
        throw new Error(dataResponse.error || 'Failed to fetch data');
      }
      
      updateProgress('analyzing-data', 'Analyzing shift swaps and preferred dates');
      
      // Pass the data object to findSwapMatches 
      const matchResponse = await findSwapMatches(
        dataResponse, 
        'Finding potential matches'
      );
      
      if (!matchResponse.success) {
        throw new Error(matchResponse.message);
      }
      
      setMatches(matchResponse.matches || []);
      setMatchResults(matchResponse.results || []);
      updateProgress('complete', `Found ${matchResponse.matches?.length || 0} potential matches`);
      
    } catch (error: any) {
      updateProgress('error', error.message);
      setError(error.message);
    } finally {
      setIsRunning(false);
      setInitialFetchCompleted(true);
    }
  };

  return {
    runMatcher,
    findMatches,
    isRunning,
    status,
    progress,
    message,
    error,
    matches,
    matchResults,
    initialFetchCompleted,
    isProcessing: isRunning || requestInProgress,
  };
}
