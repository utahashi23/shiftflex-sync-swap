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
      
      // First, delete all preferred dates associated with this request
      const { error: preferredDatesError } = await supabase
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('request_id', requestId);
        
      if (preferredDatesError) {
        console.error('Error deleting preferred dates:', preferredDatesError);
        throw preferredDatesError;
      }
      
      // Then, delete the swap request itself
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
      
      // First, check how many preferred dates exist for this request
      const { data: preferredDates, error: countError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('id')
        .eq('request_id', requestId);
        
      if (countError) {
        console.error('Error counting preferred dates:', countError);
        throw countError;
      }
      
      // If this is the last preferred date, delete the entire swap request
      if (preferredDates && preferredDates.length <= 1) {
        console.log('Last preferred date being removed, deleting entire swap request');
        return handleDeleteSwapRequest(requestId);
      }
      
      // Otherwise, just delete the specific preferred date
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
            return {
              ...req,
              preferredDates: req.preferredDates.filter(
                date => date.date !== dateStr
              )
            };
          }
          return req;
        });
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
