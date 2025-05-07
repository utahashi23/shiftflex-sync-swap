
// Re-export all API functions from their dedicated files
export { createSwapRequestApi } from './createSwapRequest';
export { deleteSwapRequestApi } from './deleteSwapRequest';
export { getUserSwapRequestsApi } from './getUserSwapRequests';

// Function to delete a single preferred date
// We'll implement this directly as we don't need a separate file for it
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const deletePreferredDateApi = async (dayId: string, requestId: string) => {
  if (!dayId || !requestId) {
    throw new Error('Day ID and Request ID are required');
  }
  
  try {
    console.log(`Attempting to delete preferred date ${dayId} from request ${requestId}`);
    
    // Try the RPC function first (most reliable)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'delete_preferred_date_safe',
      { 
        p_day_id: dayId,
        p_request_id: requestId
      }
    );
    
    if (rpcError) {
      console.error('RPC function error:', rpcError);
      
      // Fall back to direct query as a last resort
      // Check if this is the last preferred date
      const { data: preferredDates } = await supabase
        .from('shift_swap_preferred_dates')
        .select('id')
        .eq('request_id', requestId);
        
      // If there's only one preferred date, return that the request should be deleted entirely
      if (preferredDates && preferredDates.length <= 1) {
        return { 
          success: true, 
          requestDeleted: true,
          preferredDayId: dayId
        };
      }
      
      // Delete the preferred date
      const { error } = await supabase
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('id', dayId);
        
      if (error) throw error;
      
      return { 
        success: true, 
        requestDeleted: false,
        preferredDayId: dayId
      };
    }
    
    // If the RPC function was successful, return its result
    console.log('RPC function returned:', rpcData);
    return {
      success: true,
      ...rpcData,
      preferredDayId: dayId
    };
    
  } catch (error) {
    console.error('Error deleting preferred date:', error);
    throw error;
  }
};
