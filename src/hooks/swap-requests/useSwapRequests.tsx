import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createSwapRequestApi } from './createSwapRequest';
import { deleteSwapRequestApi } from './deleteSwapRequest';
import { deletePreferredDateApi } from './deletePreferredDate';
import { getSwapRequestsApi } from './getSwapRequests';
import { SwapRequest, DeletePreferredDateResult } from './types';

export function useSwapRequests() {
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Fetch all swap requests for the current user
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await getSwapRequestsApi();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a new swap request
  const createSwapRequest = useCallback(async (
    shiftIds: string[], 
    wantedDates: string[], 
    acceptedTypes: string[],
    requiredSkillset?: string[]
  ) => {
    setIsLoading(true);
    try {
      // Prepare the preferredDates array with the correct format
      const preferredDates = wantedDates.map(date => ({
        date,
        acceptedTypes
      }));
      
      // Create a swap request for each shift
      const promises = shiftIds.map(shiftId => 
        createSwapRequestApi(shiftId, preferredDates, requiredSkillset)
      );
      
      const results = await Promise.all(promises);
      
      // Check if all swap requests were successful
      const success = results.every(result => result.success);
      if (success) {
        await fetchRequests(); // Refresh the requests list
      } else {
        console.error('Error creating one or more swap requests');
      }
      
      return success;
    } catch (error) {
      console.error('Error in createSwapRequest:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchRequests]);

  // Delete a swap request
  const deleteRequest = useCallback(async (requestId: string) => {
    if (!user) return false;
    
    setIsLoading(true);
    try {
      const success = await deleteSwapRequestApi(requestId);
      if (success) {
        // Remove the deleted request from state
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
      return success;
    } catch (error) {
      console.error('Error deleting request:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Delete a preferred date from a swap request
  const deletePreferredDate = useCallback(async (dayId: string, requestId: string): Promise<DeletePreferredDateResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      const result = await deletePreferredDateApi(dayId, requestId);
      
      if (result.success) {
        if (result.requestDeleted) {
          // If the entire request was deleted, remove it from state
          setRequests(prev => prev.filter(r => r.id !== requestId));
        } else {
          // Otherwise update the specific request's preferred dates
          await fetchRequests(); // For simplicity, fetch all requests again
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Error deleting preferred date:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete preferred date' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchRequests]);

  // Refresh the swap matches 
  const refreshMatches = useCallback(async () => {
    // We'll implement this in the future, for now it just refreshes the requests list
    await fetchRequests();
  }, [fetchRequests]);

  // Delete a preferred day
  const deletePreferredDay = useCallback(async (dayId: string, requestId: string): Promise<DeletePreferredDateResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    setIsLoading(true);
    try {
      // First check if the day exists
      const { data: dayData, error: dayError } = await supabase
        .from('improved_swap_wanted_dates')
        .select('*')
        .eq('id', dayId)
        .eq('swap_id', requestId)
        .single();
      
      if (dayError) {
        return { success: false, error: 'Preferred date not found' };
      }
      
      // Count how many dates are associated with this request
      const { count, error: countError } = await supabase
        .from('improved_swap_wanted_dates')
        .select('*', { count: 'exact', head: true })
        .eq('swap_id', requestId);
      
      if (countError) {
        return { success: false, error: 'Error checking preferred dates' };
      }
      
      // If this is the only date, we need to delete the entire request
      if (count === 1) {
        const deleted = await deleteSwapRequestApi(requestId);
        return { 
          success: true, 
          requestDeleted: true,
          message: 'This was the last preferred date, so the entire request has been deleted'
        };
      }
      
      // Delete just this preferred date
      const { error: deleteError } = await supabase
        .from('improved_swap_wanted_dates')
        .delete()
        .eq('id', dayId)
        .eq('swap_id', requestId);
      
      if (deleteError) {
        return { success: false, error: 'Failed to delete preferred date' };
      }
      
      // Refresh the requests
      await fetchRequests();
      
      return { success: true, requestDeleted: false };
      
    } catch (error: any) {
      console.error('Error deleting preferred day:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete preferred day' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchRequests, deleteSwapRequestApi]);

  // Fetch swap requests on component mount
  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  return {
    requests,
    isLoading,
    fetchRequests,
    fetchSwapRequests: fetchRequests, // Alias for backward compatibility
    createSwapRequest,
    deleteRequest,
    deleteSwapRequest: deleteRequest, // Alias for backward compatibility
    deletePreferredDate,
    refreshMatches,
    deletePreferredDay
  };
}
