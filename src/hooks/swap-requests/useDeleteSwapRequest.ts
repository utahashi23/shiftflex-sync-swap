
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
    // This functionality would require a separate table for preferred dates
    // For now, we'll just handle the UI aspect
    if (!requestId || !dateStr) return;
    
    setIsLoading(true);
    
    // In a real app, this would make an API call to update the preferred dates
    setTimeout(() => {
      setSwapRequests(prev => {
        const updated = prev.map(req => {
          if (req.id === requestId) {
            const updatedPreferredDates = req.preferredDates.filter(
              date => date.date !== dateStr
            );
            
            // If no preferred dates left, remove the whole request
            if (updatedPreferredDates.length === 0) {
              return null;
            }
            
            return {
              ...req,
              preferredDates: updatedPreferredDates
            };
          }
          return req;
        }).filter(Boolean) as SwapRequest[];
        
        return updated;
      });
      
      toast({
        title: "Preferred Date Removed",
        description: "The selected date has been removed from your swap request.",
      });
      
      setIsLoading(false);
    }, 500);
  };

  return {
    handleDeleteSwapRequest,
    handleDeletePreferredDate
  };
};
