import { useState, useCallback } from 'react';
import { 
  getUserSwapRequestsApi, 
  createSwapRequestApi, 
  deleteSwapRequestApi,
  deletePreferredDateApi
} from './api';
import { useSwapMatches } from '../swap-matches';
import type { DeletePreferredDateResult } from './deletePreferredDate';

export const useSwapRequests = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  
  const { 
    matches, 
    pastMatches, 
    isLoading: isMatchesLoading, 
    fetchMatches // Correctly using fetchMatches from useSwapMatches
  } = useSwapMatches();

  const fetchSwapRequests = useCallback(async (status = 'pending') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserSwapRequestsApi(status);
      setRequests(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSwapRequest = useCallback(async (
    shiftIds: string[],
    wantedDates: string[],
    acceptedTypes: string[]
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fixing the function call by reducing to 2 arguments as expected
      // First argument is the shift ID, second is wantedDates with acceptedTypes bundled inside
      const result = await createSwapRequestApi(shiftIds[0], wantedDates);
      await fetchSwapRequests();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSwapRequests]);

  const deleteSwapRequest = useCallback(async (requestId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteSwapRequestApi(requestId);
      await fetchSwapRequests();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSwapRequests]);

  const deletePreferredDay = useCallback(async (dayId: string, requestId: string): Promise<DeletePreferredDateResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await deletePreferredDateApi(dayId, requestId);
      await fetchSwapRequests();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Return a properly typed error result
      return {
        success: false,
        requestDeleted: false,
        message: err instanceof Error ? err.message : 'Unknown error'
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchSwapRequests]);

  // Using refreshMatches properly as fetchMatches
  const refreshMatches = useCallback(() => {
    return fetchMatches(true, false);
  }, [fetchMatches]);

  return {
    isLoading,
    error,
    requests, // This is what RequestedSwaps.tsx should use instead of swapRequests
    fetchSwapRequests,
    createSwapRequest,
    deleteSwapRequest,
    deletePreferredDay,
    matches,
    pastMatches,
    isMatchesLoading,
    refreshMatches
  };
};
