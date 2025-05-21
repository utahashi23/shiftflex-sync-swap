
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Delete a swap request and its related records
 */
export const deleteSwapRequestApi = async (requestId: string): Promise<boolean> => {
  if (!requestId) {
    throw new Error('Request ID is required');
  }
  
  try {
    console.log('Deleting swap request with ID:', requestId);
    
    // First delete all wanted dates for this swap
    const { error: datesError } = await supabase
      .from('improved_swap_wanted_dates')
      .delete()
      .eq('swap_id', requestId);
    
    if (datesError) {
      console.error('Error deleting wanted dates:', datesError);
      // Continue with the request deletion anyway
    }
    
    // Then delete the main swap request
    const { error } = await supabase
      .from('improved_shift_swaps')
      .delete()
      .eq('id', requestId);
    
    if (error) {
      throw error;
    }
    
    toast({
      title: "Request Deleted",
      description: "Your swap request has been deleted successfully.",
      variant: "default"
    });
    
    return true;
    
  } catch (error) {
    console.error('Error deleting swap request:', error);
    
    toast({
      title: "Error",
      description: "There was a problem deleting your swap request.",
      variant: "destructive"
    });
    
    return false;
  }
};
