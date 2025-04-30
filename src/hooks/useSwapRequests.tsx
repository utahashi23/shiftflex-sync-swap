
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFetchSwapRequests } from './swap-requests/useFetchSwapRequests';
import { useDeleteSwapRequest } from './swap-requests/useDeleteSwapRequest';
import { UseSwapRequestsReturn } from './swap-requests/types';

export const useSwapRequests = (): UseSwapRequestsReturn => {
  const { user } = useAuth();
  const { 
    swapRequests, 
    setSwapRequests, 
    isLoading, 
    setIsLoading, 
    fetchSwapRequests 
  } = useFetchSwapRequests(user);

  const {
    handleDeleteSwapRequest,
    handleDeletePreferredDate
  } = useDeleteSwapRequest(setSwapRequests, setIsLoading);

  useEffect(() => {
    fetchSwapRequests();
  }, [user]);

  return {
    swapRequests,
    isLoading,
    fetchSwapRequests,
    handleDeleteSwapRequest,
    handleDeletePreferredDate
  };
};
