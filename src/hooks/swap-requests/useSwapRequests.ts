
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SwapRequest } from './types';

/**
 * Hook for managing user swap requests
 * Rebuilt to avoid RLS recursion issues
 */
export const useSwapRequests = () => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  /**
   * Fetch swap requests for the current user
   * Uses separate queries to avoid RLS recursion
   */
  const fetchSwapRequests = useCallback(async () => {
    if (!user) {
      console.log('No user available, skipping fetch');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Fetching swap requests for user:', user.id);
      
      // STEP 1: Fetch basic request data
      const { data: requests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('id, status, requester_shift_id, created_at')
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (requestsError) {
        throw requestsError;
      }
      
      if (!requests || requests.length === 0) {
        console.log('No pending swap requests found');
        setSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Get all the shift IDs we need
      const shiftIds = requests.map(req => req.requester_shift_id);
      
      // STEP 2: Fetch shift details separately
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, date, start_time, end_time, truck_name')
        .in('id', shiftIds);
        
      if (shiftsError) throw shiftsError;
      
      // Create a map for easy lookup
      const shiftsMap = new Map();
      shifts?.forEach(shift => shiftsMap.set(shift.id, shift));
      
      // STEP 3: Fetch preferred dates for all requests
      const requestIds = requests.map(req => req.id);
      const { data: preferredDates, error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('id, request_id, date, accepted_types')
        .in('request_id', requestIds);
        
      if (datesError) throw datesError;
      
      // Group preferred dates by request ID
      const datesByRequestId = new Map();
      preferredDates?.forEach(date => {
        if (!datesByRequestId.has(date.request_id)) {
          datesByRequestId.set(date.request_id, []);
        }
        datesByRequestId.get(date.request_id).push(date);
      });
      
      // STEP 4: Format the data into SwapRequest objects
      const formattedRequests: SwapRequest[] = requests.map(request => {
        const shift = shiftsMap.get(request.requester_shift_id);
        
        // Skip if shift data is missing
        if (!shift) return null;
        
        // Determine shift type based on start time
        const startHour = parseInt(shift.start_time.split(':')[0], 10);
        let shiftType: 'day' | 'afternoon' | 'night' = 'day';
        
        if (startHour <= 8) {
          shiftType = 'day';
        } else if (startHour > 8 && startHour < 16) {
          shiftType = 'afternoon';
        } else {
          shiftType = 'night';
        }
        
        // Get preferred dates for this request
        const dates = datesByRequestId.get(request.id) || [];
        const formattedDates = dates.map(date => ({
          id: date.id,
          date: date.date,
          acceptedTypes: date.accepted_types
        }));
        
        return {
          id: request.id,
          requesterId: user.id,
          status: request.status,
          originalShift: {
            id: shift.id,
            date: shift.date,
            title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.start_time.substring(0, 5),
            endTime: shift.end_time.substring(0, 5),
            type: shiftType
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

  /**
   * Delete a swap request
   */
  const deleteSwapRequest = async (requestId: string) => {
    if (!user || !requestId) return false;
    
    setIsLoading(true);
    try {
      console.log('Deleting swap request:', requestId);
      
      // First delete all preferred dates for this request
      const { error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('request_id', requestId);
        
      if (datesError) throw datesError;
      
      // Then delete the request itself
      const { error: requestError } = await supabase
        .from('shift_swap_requests')
        .delete()
        .eq('id', requestId)
        .eq('requester_id', user.id); // Make sure we only delete our own requests
        
      if (requestError) throw requestError;
      
      // Update local state
      setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Request deleted",
        description: "Swap request has been deleted."
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Deletion failed",
        description: "There was a problem processing your request. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Delete a preferred date from a swap request
   */
  const deletePreferredDay = async (dayId: string, requestId: string) => {
    if (!user || !dayId || !requestId) return false;
    
    setIsLoading(true);
    try {
      console.log('Deleting preferred day:', dayId);
      
      // Delete the preferred day
      const { error: deleteError } = await supabase
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('id', dayId);
        
      if (deleteError) throw deleteError;
      
      // Check if any preferred days remain for this request
      const { data: remainingDays, error: countError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('id')
        .eq('request_id', requestId);
        
      if (countError) throw countError;
      
      // If no days left, delete the whole request
      if (!remainingDays || remainingDays.length === 0) {
        const { error: deleteRequestError } = await supabase
          .from('shift_swap_requests')
          .delete()
          .eq('id', requestId);
        
        if (deleteRequestError) throw deleteRequestError;
        
        // Remove the request entirely
        setSwapRequests(prev => prev.filter(req => req.id !== requestId));
        
        toast({
          title: "Request updated",
          description: "The swap request has been removed as it had no remaining preferred dates."
        });
      } else {
        // Just update the preferred dates for this request
        setSwapRequests(prevRequests => 
          prevRequests.map(req => {
            if (req.id === requestId) {
              return {
                ...req,
                preferredDates: req.preferredDates.filter(day => day.id !== dayId)
              };
            }
            return req;
          })
        );
        
        toast({
          title: "Date removed",
          description: "Preferred date has been removed from your request."
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting preferred day:', error);
      toast({
        title: "Deletion failed",
        description: "There was a problem processing your request. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    swapRequests,
    isLoading,
    fetchSwapRequests,
    deleteSwapRequest,
    deletePreferredDay
  };
};
