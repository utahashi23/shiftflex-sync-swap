
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Delete a preferred date from a swap request
 */
export const deletePreferredDateApi = async (dayId: string, requestId: string) => {
  if (!dayId || !requestId) {
    throw new Error('Day ID and Request ID are required');
  }
  
  try {
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
        request_id: requestId,
        auth_token: authToken
      }
    });
      
    if (response.error) {
      console.error('Error deleting preferred date:', response.error);
      throw response.error;
    }
    
    return { 
      success: true, 
      requestDeleted: response.data?.requestDeleted || false 
    };
  } catch (error) {
    console.error('Error deleting preferred date:', error);
    throw error;
  }
};
