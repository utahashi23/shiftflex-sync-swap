
import { useCallback } from 'react';
import { useGetUserSwapRequests } from './useGetUserSwapRequests';
import { useDeleteSwapRequest } from './useDeleteSwapRequest';
import { useDeletePreferredDay } from './useDeletePreferredDay';
import { UseSwapRequestsReturn } from './types';

/**
 * Combined hook for swap request operations
 */
export const useSwapRequests = (): UseSwapRequestsReturn => {
  const { 
    swapRequests, 
    isLoading, 
    refetch: refetchSwapRequests, 
    setSwapRequests 
  } = useGetUserSwapRequests();
  
  const { deleteSwapRequest, isDeleting: isDeleteLoading } = useDeleteSwapRequest({
    onSuccess: () => {
      refetchSwapRequests();
    }
  });
  
  const { deletePreferredDay, isDeleting: isDayDeleteLoading } = useDeletePreferredDay({
    onSuccess: (data, requestId) => {
      // If the backend didn't delete the entire request, update the UI
      if (!data.requestDeleted) {
        // Find the request and remove the preferred day
        setSwapRequests(prevRequests => 
          prevRequests.map(request => {
            if (request.id === requestId) {
              return {
                ...request,
                preferredDates: request.preferredDates.filter(day => day.id !== data.preferredDayId)
              };
            }
            return request;
          })
        );
      } else {
        // The backend deleted the entire request, so refresh
        refetchSwapRequests();
      }
    }
  });
  
  // Wrapping refetch with a status parameter
  const fetchSwapRequests = useCallback((status: string = 'pending') => {
    return refetchSwapRequests(status);
  }, [refetchSwapRequests]);
  
  return {
    swapRequests,
    isLoading: isLoading || isDeleteLoading || isDayDeleteLoading,
    fetchSwapRequests,
    deleteSwapRequest,
    deletePreferredDay
  };
};
