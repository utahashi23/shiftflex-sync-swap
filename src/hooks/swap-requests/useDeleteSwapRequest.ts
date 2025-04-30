
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SwapRequest } from './types';

export const useDeleteSwapRequest = (
  setSwapRequests: React.Dispatch<React.SetStateAction<SwapRequest[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Delete all preferred dates for a specific shift
  const handleDeleteSwapRequest = async (shiftId: string) => {
    if (!shiftId) return;
    
    setIsLoading(true);
    
    try {
      console.log('Deleting all swap requests for shift:', shiftId);
      
      // Delete all preferred dates for this shift
      const { error } = await supabase
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('shifts.id', shiftId);
        
      if (error) {
        console.error('Database delete error:', error);
        throw error;
      }
      
      console.log('All preferred dates deleted successfully');
      
      // Update local state after successful deletion
      setSwapRequests(prev => prev.filter(req => req.originalShift.id !== shiftId));
      
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

  // Delete a single preferred date
  const handleDeletePreferredDate = async (dateId: string, shiftId: string) => {
    if (!dateId || !shiftId) return;
    
    setIsLoading(true);
    
    try {
      console.log('Deleting preferred date with id:', dateId);
      
      // First, check how many preferred dates exist for this shift
      const { data: preferredDates, error: countError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('id')
        .eq('shifts.id', shiftId);
        
      if (countError) {
        console.error('Error counting preferred dates:', countError);
        throw countError;
      }
      
      const count = preferredDates?.length || 0;
      console.log(`Found ${count} preferred dates for shift ${shiftId}`);
      
      // Delete the specific preferred date
      const { error } = await supabase
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('id', dateId);
        
      if (error) {
        console.error('Database delete error:', error);
        throw error;
      }
      
      console.log('Preferred date deleted successfully');
      
      // If this was the last preferred date, remove the entire request from state
      if (count <= 1) {
        // Update local state to remove the entire request
        setSwapRequests(prev => prev.filter(req => req.originalShift.id !== shiftId));
        
        toast({
          title: "Swap Request Deleted",
          description: "Your swap request has been deleted as it had no remaining preferred dates."
        });
      } else {
        // Update local state to remove just the preferred date
        setSwapRequests(prev => {
          return prev.map(req => {
            if (req.originalShift.id === shiftId) {
              return {
                ...req,
                preferredDates: req.preferredDates.filter(date => date.id !== dateId)
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
