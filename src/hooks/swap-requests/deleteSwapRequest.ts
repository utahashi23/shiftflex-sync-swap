
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export async function deleteSwapRequest(requestId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`Deleting swap request ${requestId}`);

    // Call the edge function to delete the request
    const { data, error } = await supabase.functions.invoke('delete_swap_request', {
      body: {
        request_id: requestId
      }
    });

    if (error) {
      console.error('Error deleting swap request:', error);
      throw error;
    }

    if (data && data.error) {
      console.error('Server returned error:', data.error);
      throw new Error(data.error);
    }

    console.log('Delete swap request result:', data);
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error in deleteSwapRequest:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to delete swap request',
      variant: 'destructive'
    });
    return {
      success: false,
      error: error.message || 'Failed to delete swap request'
    };
  }
}
