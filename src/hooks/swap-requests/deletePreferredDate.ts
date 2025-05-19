
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
    console.log(`Deleting preferred date ${dayId} from request ${requestId}`);

    // Call the edge function to delete the preferred date
    const { data, error } = await supabase.functions.invoke('delete_preferred_date', {
      body: {
        day_id: dayId,
        request_id: requestId
      }
    });

    if (error) {
      console.error('Error deleting preferred date:', error);
      throw error;
    }

    if (data.error) {
      console.error('Server returned error:', data.error);
      throw new Error(data.error);
    }

    console.log('Delete preferred date result:', data);
    return {
      success: true,
      requestDeleted: data.requestDeleted || false
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
