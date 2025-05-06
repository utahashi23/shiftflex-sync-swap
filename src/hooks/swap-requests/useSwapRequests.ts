
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
  
  const { handleDeleteSwapRequest, isDeleting: isDeleteLoading } = useDeleteSwapRequest(
    setSwapRequests,
    (value) => setIsLoading(value)
  );
  
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
  
  // Track loading state
  const setIsLoading = useCallback((value: boolean) => {
    // This function is passed to the delete hooks to update loading state
    // No implementation needed here as we're combining loading states in the return value
  }, []);
  
  // Wrapping refetch with a status parameter
  const fetchSwapRequests = useCallback((status?: string) => {
    return refetchSwapRequests(status);
  }, [refetchSwapRequests]);
  
  return {
    swapRequests,
    isLoading: isLoading || isDeleteLoading || isDayDeleteLoading,
    fetchSwapRequests,
    deleteSwapRequest: handleDeleteSwapRequest,
    deletePreferredDay
  };
};
