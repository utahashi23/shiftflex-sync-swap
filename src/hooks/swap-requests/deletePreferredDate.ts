
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Export the interface so it can be imported elsewhere
export interface DeletePreferredDateResult {
  success: boolean;
  requestDeleted: boolean;
  message?: string;
}

/**
 * Delete a preferred date from a swap request
 */
export const deletePreferredDateApi = async (dayId: string, requestId: string): Promise<DeletePreferredDateResult> => {
  if (!dayId || !requestId) {
    throw new Error('Day ID and Request ID are required');
  }
  
  try {
    console.log('Attempting to delete preferred date:', { dayId, requestId });
    
    // Try to use the RPC function first (most reliable)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'delete_preferred_date_safe',
      { 
        p_day_id: dayId,
        p_request_id: requestId
      }
    );
    
    if (!rpcError) {
      console.log('Successfully deleted preferred date using RPC function:', rpcData);
      
      // Check if the result indicates the entire request was deleted
      const wasRequestDeleted = rpcData && typeof rpcData === 'object' && 'requestDeleted' in rpcData 
        ? Boolean(rpcData.requestDeleted)
        : false;
      
      if (wasRequestDeleted) {
        toast({
          title: "Swap Request Deleted",
          description: "This was the last preferred date, so the entire request has been removed."
        });
      } else {
        toast({
          title: "Date Removed",
          description: "The selected date has been removed from your swap request."
        });
      }
      
      return { 
        success: true, 
        requestDeleted: wasRequestDeleted 
      };
    }
    
    console.warn('RPC function failed, falling back to edge function:', rpcError);
    
    // Get the current session to pass the auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to modify a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const authToken = session.access_token;
    
    // Use the edge function to safely delete a preferred date
    const response = await supabase.functions.invoke('delete_preferred_day', {
      body: { 
        day_id: dayId,
        request_id: requestId
      },
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
      
    if (response.error) {
      console.error('Error deleting preferred date with edge function:', response.error);
      throw response.error;
    }
    
    // Check if the result indicates the entire request was deleted
    const wasRequestDeleted = response.data && typeof response.data === 'object' && 'requestDeleted' in response.data 
      ? Boolean(response.data.requestDeleted)
      : false;
    
    return { 
      success: true, 
      requestDeleted: wasRequestDeleted 
    };
  } catch (error) {
    console.error('Error deleting preferred date:', error);
    toast({
      title: "Failed to Delete",
      description: "There was a problem removing the date from your swap request.",
      variant: "destructive"
    });
    return { 
      success: false, 
      requestDeleted: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
