
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Delete a swap request
 */
export const deleteSwapRequestApi = async (requestId: string) => {
  if (!requestId) {
    throw new Error('Request ID is required');
  }
  
  try {
    console.log('Attempting to delete swap request with ID:', requestId);
    
    // Try to use the RPC function first (most reliable)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'delete_swap_request_safe',
      { 
        p_request_id: requestId,
        p_user_id: (await supabase.auth.getUser()).data.user?.id 
      }
    );
    
    if (!rpcError) {
      console.log('Successfully deleted swap request using RPC function:', rpcData);
      
      toast({
        title: "Swap Request Deleted",
        description: "Your swap request has been deleted successfully."
      });
      
      return { success: true };
    }
    
    console.warn('RPC function failed, falling back to edge function:', rpcError);
    
    // Fall back to the edge function if RPC fails
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Authentication required');
    }
    
    if (!sessionData.session) {
      console.error('No active session found');
      toast({
        title: "Authentication Error",
        description: "You must be logged in to delete a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }

    const token = sessionData.session.access_token;
    console.log('Using token for delete request:', token.substring(0, 10) + '...');
    
    // Use the edge function to safely delete the request
    const { data, error } = await supabase.functions.invoke('delete_swap_request', {
      body: { request_id: requestId },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (error) {
      console.error('Error deleting swap request:', error);
      throw error;
    }
    
    toast({
      title: "Swap Request Deleted",
      description: "Your swap request has been deleted successfully."
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting swap request:', error);
    toast({
      title: "Delete Failed",
      description: "There was a problem deleting your swap request.",
      variant: "destructive"
    });
    throw error;
  }
};
