import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SwapRequest } from './types';

export const useDeleteSwapRequest = (
  setSwapRequests: React.Dispatch<React.SetStateAction<SwapRequest[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Delete an entire swap request
  const handleDeleteSwapRequest = async (requestId: string) => {
    if (!requestId) return;
    
    setIsLoading(true);
    
    try {
      console.log('Deleting swap request with ID:', requestId);
      
      // Execute the delete operation
      const { error } = await supabase
        .from('shift_swap_requests')
        .delete()
        .eq('id', requestId);
        
      if (error) {
        console.error('Database delete error:', error);
        throw error;
      }
      
      console.log('Swap request deleted successfully');
      
      // Update local state after successful deletion
      setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Swap Request Deleted",
        description: "Your swap request has been deleted."
      });
      
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Error",
        description: "Failed to delete the swap request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a single preferred date from a swap request
  const handleDeletePreferredDate = async (requestId: string, dateStr: string) => {
    if (!requestId || !dateStr) return;
    
    setIsLoading(true);
    
    try {
      console.log('Deleting preferred date:', dateStr, 'from request:', requestId);
      
      // Delete the preferred date from the database
      const { error } = await supabase
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('request_id', requestId)
        .eq('date', dateStr);
        
      if (error) {
        console.error('Database delete error:', error);
        throw error;
      }
      
      console.log('Preferred date deleted successfully');
      
      // Update local state after successful deletion
      setSwapRequests(prev => {
        return prev.map(req => {
          if (req.id === requestId) {
            // Check if this was the last preferred date
            const updatedPreferredDates = req.preferredDates.filter(
              date => date.date !== dateStr
            );
            
            // If no preferred dates left, remove the whole request
            if (updatedPreferredDates.length === 0) {
              return null;
            }
            
            // Otherwise update the request with remaining preferred dates
            return {
              ...req,
              preferredDates: updatedPreferredDates
            };
          }
          return req;
        }).filter(Boolean) as SwapRequest[];
      });
      
      toast({
        title: "Preferred Date Removed",
        description: "The selected date has been removed from your swap request.",
      });
      
    } catch (error) {
      console.error('Error deleting preferred date:', error);
      toast({
        title: "Error",
        description: "Failed to delete the preferred date. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleDeleteSwapRequest,
    handleDeletePreferredDate
  };
};
