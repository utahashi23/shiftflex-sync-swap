
import { useState } from 'react';
import { useSwapRequests } from '../../swap-requests';
import { useFindSwapMatches } from './useFindSwapMatches';
import { useProcessState } from './useProcessState'; // Updated import
import { fetchAllData } from '../operations/fetchAllData';
import { toast } from '@/hooks/use-toast';

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

  const { 
    status,
    progress, 
    message,
    startProcessing,
    updateProgress 
  } = useProcessState();

  const { findSwapMatches } = useFindSwapMatches();

  const runMatcher = async () => {
    if (isRunning) return;
    
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
      
      toast({
        title: 'Matching Complete',
        description: `Found ${matchResponse.matches?.length || 0} potential matches`,
      });
      
    } catch (error: any) {
      updateProgress('error', error.message);
      setError(error.message);
      toast({
        title: 'Error Running Matcher',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return {
    runMatcher,
    isRunning,
    status,
    progress,
    message,
    error,
    matches,
    matchResults,
  };
}
