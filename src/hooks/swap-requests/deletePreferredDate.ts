
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Export the result type for use in other components
export interface DeletePreferredDateResult {
  success: boolean;
  requestDeleted?: boolean;
  error?: string;
}

export async function deletePreferredDate(dayId: string, requestId: string): Promise<DeletePreferredDateResult> {
  try {
    if (!dayId || !requestId) {
      console.error('Missing required parameters:', { dayId, requestId });
      return {
        success: false,
        error: 'Missing required parameters: Both day ID and request ID are required'
      };
    }
    
    // Check if user is authenticated
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.error('No active session found');
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    console.log(`Deleting preferred date ${dayId} from request ${requestId}`);

    // Call the edge function "delete_preferred_day"
    const { data, error } = await supabase.functions.invoke('delete_preferred_day', {
      body: {
        day_id: dayId,
        request_id: requestId
      }
    });

    if (error) {
      console.error('Error from edge function:', error);
      throw error;
    }

    // Check if data is an object with error property
    if (!data || (typeof data === 'object' && 'error' in data && data.error)) {
      console.error('Server returned error:', data?.error);
      throw new Error(data?.error || 'Unknown error from server');
    }

    console.log('Delete preferred date result:', data);
    return {
      success: true,
      requestDeleted: data?.requestDeleted || false
    };
  } catch (error: any) {
    console.error('Error in deletePreferredDate:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to delete preferred date',
      variant: 'destructive'
    });
    return {
      success: false,
      error: error.message || 'Failed to delete preferred date'
    };
  }
}

// Also export as API function for consistent naming
export const deletePreferredDateApi = deletePreferredDate;
