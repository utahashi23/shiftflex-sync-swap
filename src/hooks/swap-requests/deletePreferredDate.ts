
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
    console.log('Deleting preferred date:', { dayId, requestId });
    
    // First try to use the edge function which provides better security and avoids RLS issues
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      console.error('No active session found');
      throw new Error('Authentication required');
    }
    
    const token = sessionData.session.access_token;
    
    // Call the edge function with the auth token
    const { data, error } = await supabase.functions.invoke('delete_preferred_date', {
      body: { day_id: dayId, request_id: requestId },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }
    
    console.log('Edge function response:', data);
    
    // Fall back to RPC if needed
    if (!data) {
      console.log('Edge function returned no data, falling back to RPC');
      // Use the new RPC function which bypasses RLS issues
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('delete_preferred_date_rpc', { 
          p_day_id: dayId, 
          p_request_id: requestId 
        });
        
      if (rpcError) throw rpcError;
      
      return rpcData as unknown as DeletePreferredDateResult;
    }
    
    return data as DeletePreferredDateResult;
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
