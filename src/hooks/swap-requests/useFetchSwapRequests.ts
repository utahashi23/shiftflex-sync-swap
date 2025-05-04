
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { SwapRequest } from './types';
import { fetchUserSwapRequestsSafe } from '@/utils/rls-helpers';

/**
 * Fetches swap requests using the safe RPC function that avoids RLS recursion
 */
export const useFetchSwapRequests = (user: User | null) => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSwapRequests = useCallback(async () => {
    if (!user || !user.id) {
      console.log('No user or user ID available, skipping fetch');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching swap requests for user:', user.id);
      
      // Use our safe function that won't cause RLS recursion
      const { data, error: fetchError } = await fetchUserSwapRequestsSafe(user.id, 'pending');
      
      if (fetchError) throw fetchError;
      
      if (!data || data.length === 0) {
        console.log('No pending swap requests found');
        setSwapRequests([]);
        setIsLoading(false);
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
      setError(err as Error);
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
    setSwapRequests, 
    isLoading, 
    error,
    fetchSwapRequests 
  };
};
