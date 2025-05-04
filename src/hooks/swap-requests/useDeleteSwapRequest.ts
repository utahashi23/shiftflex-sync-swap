
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SwapRequest } from './types';
import { deleteSwapRequestApi } from './api';
import { useAuth } from '@/hooks/useAuth';

export const useDeleteSwapRequest = (
  setSwapRequests: React.Dispatch<React.SetStateAction<SwapRequest[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { user } = useAuth();
  
  // Delete an entire swap request
  const handleDeleteSwapRequest = async (requestId: string) => {
    if (!requestId || !user) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive"
      });
      return false;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Deleting swap request:', requestId);
      
      // Call the API to delete the swap request
      await deleteSwapRequestApi(requestId);
      
      // Update local state after successful deletion
      setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      
      return true;
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Delete Failed",
        description: "There was a problem deleting your swap request. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a single preferred date
  const handleDeletePreferredDay = async (dayId: string, requestId: string) => {
    if (!dayId || !requestId || !user) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive"
      });
      return false;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Deleting preferred day with id:', dayId);
      
      // For now, we'll just delete the entire request if it's the last preferred date
      // This is simpler than implementing another edge function just for preferred date deletion
      const { data: preferredDates } = await supabase
        .from('shift_swap_preferred_dates')
        .select('id')
        .eq('request_id', requestId);
        
      // If this is the only preferred date, delete the entire request
      if (preferredDates && preferredDates.length <= 1) {
        console.log('This is the last preferred date, deleting entire request');
        return await handleDeleteSwapRequest(requestId);
      }
      
      // Otherwise, delete just the preferred date
      const { error } = await supabase
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('id', dayId);
        
      if (error) {
        console.error('Error deleting preferred date:', error);
        
        // If we encounter a permissions error, try using the delete_preferred_day edge function
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.log('Trying to use edge function for preferred date deletion');
          
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            throw new Error('Authentication required');
          }
          
          const { error: fnError } = await supabase.functions.invoke('delete_preferred_day', {
            body: { day_id: dayId, request_id: requestId },
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`
            }
          });
          
          if (fnError) throw fnError;
        } else {
          throw error;
        }
      }
      
      // Update local state to remove just the preferred day
      setSwapRequests(prev => {
        return prev.map(req => {
          if (req.id === requestId) {
            return {
              ...req,
              preferredDates: req.preferredDates.filter(date => date.id !== dayId)
            };
          }
          return req;
        });
      });
      
      toast({
        title: "Date Removed",
        description: "The selected date has been removed from your swap request."
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting preferred date:', error);
      toast({
        title: "Failed to delete date",
        description: "There was a problem removing your preferred date",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleDeleteSwapRequest,
    handleDeletePreferredDay
  };
};
