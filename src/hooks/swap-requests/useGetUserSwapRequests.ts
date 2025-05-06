
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SwapRequest } from './types';
import { getUserSwapRequestsApi } from './api';

/**
 * Hook for fetching user's swap requests
 */
export const useGetUserSwapRequests = (initialStatus: string = 'pending') => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const { user } = useAuth();

  const fetchSwapRequests = useCallback(async (requestStatus?: string) => {
    if (!user) {
      console.log('No user available, skipping fetch');
      return;
    }
    
    // Update status if provided
    if (requestStatus) {
      setStatus(requestStatus);
    }
    
    const statusToUse = requestStatus || status;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching ${statusToUse} swap requests for user:`, user.id);
      const requests = await getUserSwapRequestsApi(statusToUse);
      
      console.log('Fetched swap requests:', requests);
      setSwapRequests(requests);
    } catch (err) {
      console.error('Error fetching swap requests:', err);
      setError(err as Error);
      // We don't show a toast here as getUserSwapRequestsApi already handles that
    } finally {
      setIsLoading(false);
    }
  }, [user, status]);

  // Load swap requests on mount or when user/status changes
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user, fetchSwapRequests]);

  return {
    swapRequests,
    isLoading,
    error,
    refetch: fetchSwapRequests,
    setSwapRequests
  };
};
