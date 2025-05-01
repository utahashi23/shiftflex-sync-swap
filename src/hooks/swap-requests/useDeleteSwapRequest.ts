
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SwapRequest } from './types';
import { deletePreferredDateApi, deleteSwapRequestApi } from './api';

export const useDeleteSwapRequest = (
  setSwapRequests: React.Dispatch<React.SetStateAction<SwapRequest[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Delete an entire swap request
  const handleDeleteSwapRequest = async (requestId: string) => {
    if (!requestId) return false;
    
    setIsLoading(true);
    
    try {
      console.log('Deleting swap request:', requestId);
      
      // Call the API to delete the swap request
      await deleteSwapRequestApi(requestId);
      
      // Update local state after successful deletion
      setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Swap Request Deleted",
        description: "Your swap request has been deleted."
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Failed to delete request",
        description: "There was a problem deleting your swap request",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a single preferred date
  const handleDeletePreferredDay = async (dayId: string, requestId: string) => {
    if (!dayId || !requestId) return false;
    
    setIsLoading(true);
    
    try {
      console.log('Deleting preferred day with id:', dayId);
      
      // Call the API to delete the preferred day
      const result = await deletePreferredDateApi(dayId, requestId);
      
      // Check if the entire request was deleted (no preferred days left)
      const requestDeleted = result?.requestDeleted || false;
      
      if (requestDeleted) {
        // Remove the entire request from state
        setSwapRequests(prev => prev.filter(req => req.id !== requestId));
        
        toast({
          title: "Swap Request Deleted",
          description: "Your swap request has been deleted as it had no remaining preferred dates."
        });
      } else {
        // Update local state to remove just the preferred day
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
        
        toast({
          title: "Preferred Date Removed",
          description: "The selected date has been removed from your swap request."
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting preferred date:', error);
      toast({
        title: "Failed to delete date",
        description: "There was a problem removing your preferred date",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleDeleteSwapRequest,
    handleDeletePreferredDay
  };
};
