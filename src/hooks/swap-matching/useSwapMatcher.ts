import { useState, useCallback, useRef } from 'react';
import { useSwapRequests } from '../swap-requests';
import { useFindSwapMatches } from './useFindSwapMatches';
import { useProcessState } from './useProcessState';
import { fetchAllData } from './operations/fetchData';

export type MatchingStatus =
  | 'idle'
  | 'fetching-data'
  | 'analyzing-data'
  | 'finding-matches'
  | 'storing-matches'
  | 'complete'
  | 'error';

export function useSwapMatcher() {
  // Fix: Access the refreshMatches function correctly
  const { refreshMatches } = useSwapRequests();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [initialFetchCompleted, setInitialFetchCompleted] = useState(false);
  const [requestInProgress, setRequestInProgress] = useState(false);
  
  // Use a ref to track if a request is already in flight
  const requestInFlightRef = useRef(false);

  const { 
    status,
    progress, 
    message,
    startProcessing,
    updateProgress,
    isProcessing 
  } = useProcessState();

  const { findSwapMatches: findMatches } = useFindSwapMatches(setRequestInProgress);

  /**
   * Optimized function to find matches that prevents duplicate/excessive requests
   */
  const findSwapMatches = useCallback(async (
    userId?: string, 
    forceCheck: boolean = false,
    verbose: boolean = false
  ) => {
    // Skip if already in progress
    if (requestInProgress || requestInFlightRef.current) {
      console.log('Match finding operation already in progress, skipping');
      return { success: false, message: 'Operation already in progress' };
    }
    
    requestInFlightRef.current = true;
    setRequestInProgress(true);
    
    try {
      console.log('Finding potential matches for user');
      updateProgress('finding-matches', 'Finding potential matches');
      
      // Use userId if provided, otherwise expect it to be included in the findSwapMatches function
      const matchData = await findMatches(
        userId || '',
        forceCheck,
        verbose
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
        matches: matchData || [],
        // Initialize an empty results array to avoid the TypeScript error
        results: [] 
      };
    } catch (error: any) {
      console.error('Error finding matches:', error);
      setError(error.message);
      updateProgress('error', error.message);
      return { 
        success: false, 
        message: error.message, 
        matches: [],
        // Initialize an empty results array to avoid the TypeScript error
        results: [] 
      };
    } finally {
      setRequestInProgress(false);
      // Reset the in-flight ref after a short delay to prevent rapid successive calls
      setTimeout(() => {
        requestInFlightRef.current = false;
      }, 500);
    }
  }, [findMatches, requestInProgress, updateProgress]);

  /**
   * Run the matcher with proper request throttling
   */
  const runMatcher = useCallback(async () => {
    if (isRunning || requestInProgress || requestInFlightRef.current) {
      console.log('Matcher is already running, skipping duplicate request');
      return;
    }
    
    setIsRunning(true);
    requestInFlightRef.current = true;
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
      
      // Pass the userId instead of the whole data object to findMatches
      // Use auth.uid() or null if no user is authenticated
      const userId = ''; // This should come from auth context in a real app
      const matchResponse = await findSwapMatches(
        userId,
        true, // forceCheck as boolean
        true  // verbose as boolean
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
      // Reset the in-flight ref after a short delay
      setTimeout(() => {
        requestInFlightRef.current = false;
      }, 500);
    }
  }, [findMatches, isRunning, requestInProgress, startProcessing, updateProgress]);

  return {
    runMatcher,
    findSwapMatches,
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
