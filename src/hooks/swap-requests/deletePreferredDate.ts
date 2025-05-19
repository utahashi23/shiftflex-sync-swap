
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Define the result type for the deletePreferredDate function
export interface DeletePreferredDateResult {
  success: boolean;
  requestDeleted: boolean;
  message?: string;
}

// Function to delete a single preferred date
export const deletePreferredDateApi = async (dayId: string, requestId: string): Promise<DeletePreferredDateResult> => {
  if (!dayId || !requestId) {
    throw new Error('Day ID and Request ID are required');
  }
  
  try {
    // Check if this is the last preferred date
    const { data: preferredDates } = await supabase
      .from('shift_swap_preferred_dates')
      .select('id')
      .eq('request_id', requestId);
      
    // If there's only one preferred date, return that the request should be deleted entirely
    if (preferredDates && preferredDates.length <= 1) {
      return { success: true, requestDeleted: true };
    }
    
    // Delete the preferred date
    const { error } = await supabase
      .from('shift_swap_preferred_dates')
      .delete()
      .eq('id', dayId);
      
    if (error) throw error;
    
    return { success: true, requestDeleted: false };
  } catch (error) {
    console.error('Error deleting preferred date:', error);
    toast({
      title: "Failed to delete date",
      description: "There was a problem removing your preferred date",
      variant: "destructive"
    });
    
    // Return a properly structured error result
    return { 
      success: false, 
      requestDeleted: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
