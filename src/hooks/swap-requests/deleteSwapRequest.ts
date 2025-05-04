
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
    // Get the current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error('Authentication error:', sessionError);
      toast({
        title: "Authentication Error",
        description: "You must be logged in to delete a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    // Use the edge function to safely delete the request
    // Include auth headers to pass the session token
    const { data, error } = await supabase.functions.invoke('delete_swap_request', {
      body: { request_id: requestId },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
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
