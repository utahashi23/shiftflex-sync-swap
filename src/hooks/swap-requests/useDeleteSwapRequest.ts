
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDeleteSwapRequest = () => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();

  const deleteSwapRequest = async (requestId: string) => {
    if (!requestId) {
      toast({
        title: 'Error',
        description: 'Invalid request ID',
        variant: 'destructive',
      });
      return { success: false, error: 'Invalid request ID' };
    }
    
    try {
      setIsDeleting(true);
      
      console.log(`Deleting swap request with ID: ${requestId}`);
      
      // First, get the request to see if it has preferred dates
      const { data: request, error: requestError } = await supabase
        .from('shift_swap_requests')
        .select('*, shift_swap_preferred_dates(*)')
        .eq('id', requestId)
        .single();
        
      if (requestError || !request) {
        throw new Error(requestError?.message || 'Request not found');
      }
      
      console.log('Found request:', request);
      
      // If it has preferred dates, delete those first
      if (request.shift_swap_preferred_dates && request.shift_swap_preferred_dates.length > 0) {
        console.log(`Request has ${request.shift_swap_preferred_dates.length} preferred dates, deleting them first`);
        
        const { error: preferredDatesError } = await supabase
          .from('shift_swap_preferred_dates')
          .delete()
          .eq('request_id', requestId);
          
        if (preferredDatesError) {
          throw new Error(`Failed to delete preferred dates: ${preferredDatesError.message}`);
        }
      }
      
      // Now delete the request itself
      const { error: deleteError } = await supabase
        .from('shift_swap_requests')
        .delete()
        .eq('id', requestId);
        
      if (deleteError) {
        throw new Error(`Failed to delete request: ${deleteError.message}`);
      }
      
      toast({
        title: 'Success',
        description: 'Swap request deleted successfully',
      });
      
      return { success: true };
      
    } catch (err: any) {
      console.error('Error deleting swap request:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete swap request',
        variant: 'destructive',
      });
      return { success: false, error: err.message || 'Failed to delete swap request' };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    deleteSwapRequest
  };
};
