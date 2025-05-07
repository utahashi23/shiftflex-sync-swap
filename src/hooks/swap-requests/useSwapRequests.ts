
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SwapRequest } from './types';
import { fetchUserSwapRequestsSafe } from '@/utils/rls-helpers';
import { useDeleteSwapRequest } from './useDeleteSwapRequest';

/**
 * Hook for managing user swap requests
 * Using RPC functions to avoid RLS recursion issues
 */
export const useSwapRequests = () => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  // Get the delete handler functions
  const { 
    handleDeleteSwapRequest, 
    handleDeletePreferredDay 
  } = useDeleteSwapRequest(setSwapRequests, setIsLoading);

  /**
   * Fetch swap requests for the current user using the safe RPC function
   */
  const fetchSwapRequests = useCallback(async () => {
    if (!user) {
      console.log('No user available, skipping fetch');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Fetching swap requests for user:', user.id);
      
      // Use our safe function that won't cause RLS recursion
      const { data, error } = await fetchUserSwapRequestsSafe(user.id, 'pending');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('No pending swap requests found');
        setSwapRequests([]);
        return;
      }
      
      console.log('Received swap requests data:', data);
      
      // Format the received data into SwapRequest objects
      const formattedRequests: SwapRequest[] = data.map((item: any) => {
        const shift = item.shift;
        const preferredDates = item.preferred_dates || [];
        
        if (!shift) return null;
        
        // Format preferred dates
        const formattedDates = preferredDates.map((date: any) => ({
          id: date.id,
          date: date.date,
          acceptedTypes: date.accepted_types as ("day" | "afternoon" | "night")[]
        }));
        
        return {
          id: item.id,
          requesterId: item.requester_id,
          status: item.status,
          originalShift: {
            id: shift.id,
            date: shift.date,
            title: shift.truckName || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.startTime.substring(0, 5),
            endTime: shift.endTime.substring(0, 5),
            type: shift.type
          },
          preferredDates: formattedDates
        };
      }).filter(Boolean) as SwapRequest[];
      
      console.log('Formatted requests:', formattedRequests);
      setSwapRequests(formattedRequests);
      
    } catch (err) {
      console.error('Error fetching swap requests:', err);
      toast({
        title: "Error",
        description: "Failed to load swap requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load swap requests on mount or when user changes
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user, fetchSwapRequests]);

  return {
    swapRequests,
    isLoading,
    fetchSwapRequests,
    deleteSwapRequest: handleDeleteSwapRequest,
    deletePreferredDay: handleDeletePreferredDay
  };
};
