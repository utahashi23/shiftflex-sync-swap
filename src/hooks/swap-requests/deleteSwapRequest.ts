
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
    // Get the current session to pass the auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to delete a swap request.",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    const authToken = session.access_token;
    
    // Use the edge function to safely delete the request
    const response = await supabase.functions.invoke('delete_swap_request', {
      body: { 
        request_id: requestId,
        auth_token: authToken
      }
    });
      
    if (response.error) {
      console.error('Error deleting swap request:', response.error);
      throw response.error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting swap request:', error);
    throw error;
  }
};
