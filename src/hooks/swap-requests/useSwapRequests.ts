
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFetchSwapRequests } from './useFetchSwapRequests';
import { useDeleteSwapRequest } from './useDeleteSwapRequest';
import { UseSwapRequestsReturn } from './types';

export const useSwapRequests = (): UseSwapRequestsReturn => {
  const { user } = useAuth();
  
  const { 
    swapRequests, 
    setSwapRequests, 
    isLoading, 
    fetchSwapRequests 
  } = useFetchSwapRequests(user);
  
  const { 
    handleDeleteSwapRequest, 
    handleDeletePreferredDay 
  } = useDeleteSwapRequest(setSwapRequests, setIsLoading => {});
  
  // Load swap requests on component mount or when user changes
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user, fetchSwapRequests]);
  
  return {
    swapRequests,
    isLoading,
    fetchSwapRequests,
    deleteSwapRequest: handleDeleteSwapRequest,
    deletePreferredDay: handleDeletePreferredDay
  };
};
