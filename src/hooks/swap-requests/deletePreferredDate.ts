
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
    // Use the new RPC function which bypasses RLS issues
    const { data, error } = await supabase
      .rpc('delete_preferred_date_rpc', { 
        p_day_id: dayId, 
        p_request_id: requestId 
      });
      
    if (error) throw error;
    
    // Explicitly cast the data to match our expected structure
    // First cast to unknown then to our interface to avoid TypeScript errors
    return data as unknown as DeletePreferredDateResult;
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
