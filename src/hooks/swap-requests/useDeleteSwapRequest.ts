import { toast } from '@/hooks/use-toast';
import { SwapRequest } from './types';
import { deleteSwapRequestApi } from './deleteSwapRequest';
import { deletePreferredDateApi } from './deletePreferredDate';
import { useAuth } from '@/hooks/useAuth';

export const useDeleteSwapRequest = (
  setSwapRequests: React.Dispatch<React.SetStateAction<SwapRequest[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { user } = useAuth();
  
  // Delete an entire swap request
  const handleDeleteSwapRequest = async (requestId: string) => {
    if (!requestId || !user) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive"
      });
      return false;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Deleting swap request:', requestId);
      
      // Call the API to delete the swap request
      const result = await deleteSwapRequestApi(requestId);
      
      if (result.success) {
        // Update local state after successful deletion
        setSwapRequests(prev => prev.filter(req => req.id !== requestId));
        return true;
      } else {
        throw new Error('Failed to delete swap request');
      }
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Delete Failed",
        description: "There was a problem deleting your swap request. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a single preferred date
  const handleDeletePreferredDay = async (dayId: string, requestId: string) => {
    if (!dayId || !requestId || !user) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive"
      });
      return { success: false };
    }
    
    setIsLoading(true);
    
    try {
      console.log('Deleting preferred day with id:', dayId, 'from request:', requestId);
      
      // Call the API to delete the preferred date
      const result = await deletePreferredDateApi(dayId, requestId);
      
      // If this was the last preferred date and the entire request was deleted
      if (result.requestDeleted) {
        // Remove the request from the list
        setSwapRequests(prev => prev.filter(req => req.id !== requestId));
        return result;
      }
      
      // Otherwise, just update the preferred dates list
      setSwapRequests(prev => {
        return prev.map(req => {
          if (req.id === requestId) {
            return {
              ...req,
              preferredDates: req.preferredDates.filter(date => date.id !== dayId)
            };
          }
          return req;
        });
      });
      
      return result;
    } catch (error) {
      console.error('Error deleting preferred date:', error);
      toast({
        title: "Failed to delete date",
        description: "There was a problem removing your preferred date",
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleDeleteSwapRequest,
    handleDeletePreferredDay
  };
};
