
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SwapRequest } from './types';
import { getUserSwapRequestsApi } from './api';

/**
 * Hook for fetching user's swap requests
 */
export const useGetUserSwapRequests = (status: string = 'pending') => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchSwapRequests = useCallback(async () => {
    if (!user) {
      console.log('No user available, skipping fetch');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching ${status} swap requests for user:`, user.id);
      const requests = await getUserSwapRequestsApi(status);
      
      console.log('Fetched swap requests:', requests);
      setSwapRequests(requests);
    } catch (err) {
      console.error('Error fetching swap requests:', err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to load swap requests. Please try again.",
        variant: "destructive"
      });
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
