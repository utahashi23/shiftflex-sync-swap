import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DeletePreferredDateResult } from './types';

/**
 * Delete a preferred date from a swap request
 */
export const deletePreferredDateApi = async (
  dayId: string, 
  requestId: string
): Promise<DeletePreferredDateResult> => {
  if (!dayId || !requestId) {
    return { success: false, error: 'Day ID and Request ID are required' };
  }
  
  try {
    console.log('Deleting preferred date:', dayId, 'from request:', requestId);
    
    // First check how many preferred dates exist
    const { count, error: countError } = await supabase
      .from('improved_swap_wanted_dates')
      .select('*', { count: 'exact', head: true })
      .eq('swap_id', requestId);
    
    if (countError) {
      throw new Error('Failed to check preferred dates count');
    }
    
    // If this is the last one, we should delete the entire request
    if (count === 1) {
      console.log('Last preferred date, deleting the entire request');
      
      // Delete the swap request (which will cascade to delete the preferred date)
      const { error } = await supabase
        .from('improved_shift_swaps')
        .delete()
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: "Request Deleted",
        description: "This was the only preferred date, so the entire request has been deleted.",
        variant: "default"
      });
      
      return { 
        success: true, 
        requestDeleted: true,
        message: 'This was the last preferred date, so the entire request has been deleted'
      };
    }
    
    // Otherwise just delete this specific preferred date
    const { error } = await supabase
      .from('improved_swap_wanted_dates')
      .delete()
      .eq('id', dayId)
      .eq('swap_id', requestId);
    
    if (error) throw error;
    
    toast({
      title: "Date Removed",
      description: "The preferred date has been removed from your swap request.",
      variant: "default"
    });
    
    return { success: true, requestDeleted: false };
    
  } catch (error: any) {
    console.error('Error deleting preferred date:', error);
    
    toast({
      title: "Error",
      description: "There was a problem removing the preferred date.",
      variant: "destructive"
    });
    
    return { 
      success: false, 
      error: error.message || 'Failed to delete preferred date' 
    };
  }
};
