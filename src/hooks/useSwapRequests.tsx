
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PreferredDay {
  id: string;
  date: string;
  acceptedTypes: string[];
}

export interface SwapRequest {
  id: string;
  status: string;
  originalShift: {
    id: string;
    date: string;
    title: string;
    startTime: string;
    endTime: string;
    type: string;
  };
  preferredDays: PreferredDay[];
}

export interface SwapRequestsState {
  swapRequests: SwapRequest[];
  isLoading: boolean;
  error: Error | null;
}

const getShiftType = (startTime: string): string => {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 5 && hour < 12) return 'day';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'night';
};

export function useSwapRequests() {
  const [state, setState] = useState<SwapRequestsState>({
    swapRequests: [],
    isLoading: true,
    error: null
  });
  
  const { user } = useAuth();
  
  const fetchSwapRequests = async () => {
    if (!user) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Fetch the user's pending swap requests using our Edge Function
      const { data: requestsData, error: requestsError } = await supabase.functions.invoke('get_swap_requests', {
        body: { user_id: user.id, status: 'pending' }
      });
      
      if (requestsError) throw requestsError;
      
      console.log('Raw request data:', requestsData);
      
      if (!requestsData || !Array.isArray(requestsData) || requestsData.length === 0) {
        setState({
          swapRequests: [],
          isLoading: false,
          error: null
        });
        return;
      }
      
      // Process and format the requests data using the already processed data from our Edge Function
      const formattedRequests = (requestsData as any[]).map(request => {
        return {
          id: request.id,
          status: request.status,
          originalShift: {
            id: request.shift.id,
            date: request.shift.date,
            title: request.shift.truck_name || 'Shift',
            startTime: request.shift.start_time,
            endTime: request.shift.end_time,
            type: getShiftType(request.shift.start_time)
          },
          preferredDays: request.preferred_days?.map((day: any) => ({
            id: day.id,
            date: day.date,
            acceptedTypes: day.accepted_types || ['day', 'afternoon', 'night']
          })) || []
        };
      }).filter(Boolean) as SwapRequest[];
      
      console.log(`Processed ${formattedRequests.length} swap requests`);
      
      setState({
        swapRequests: formattedRequests,
        isLoading: false,
        error: null
      });
      
    } catch (error: any) {
      console.error('Error fetching swap requests:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      toast({
        title: "Failed to load swap requests",
        description: "There was a problem loading your swap requests",
        variant: "destructive"
      });
    }
  };
  
  const deleteSwapRequest = async (requestId: string) => {
    if (!user || !requestId) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Delete the swap request using Edge Function
      const { error } = await supabase.functions.invoke('delete_swap_request', {
        body: {
          request_id: requestId,
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      // Update the local state
      setState(prev => ({
        ...prev,
        swapRequests: prev.swapRequests.filter(req => req.id !== requestId),
        isLoading: false
      }));
      
      toast({
        title: "Swap Request Deleted",
        description: "Your shift swap request has been deleted",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Failed to delete swap request",
        description: "There was a problem deleting your swap request",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };
  
  const deletePreferredDay = async (dayId: string, requestId: string) => {
    if (!user || !dayId || !requestId) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Delete the preferred day using Edge Function
      const { data, error } = await supabase.functions.invoke('delete_preferred_day', {
        body: {
          day_id: dayId,
          request_id: requestId,
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      // If the function indicates the whole request was deleted
      if (data && data.request_deleted) {
        // Remove the whole request from state
        setState(prev => ({
          ...prev,
          swapRequests: prev.swapRequests.filter(req => req.id !== requestId),
          isLoading: false
        }));
      } else {
        // Just remove the preferred day
        setState(prev => ({
          ...prev,
          swapRequests: prev.swapRequests.map(req => {
            if (req.id === requestId) {
              return {
                ...req,
                preferredDays: req.preferredDays.filter(day => day.id !== dayId)
              };
            }
            return req;
          }),
          isLoading: false
        }));
      }
      
      toast({
        title: "Preferred Date Removed",
        description: "The selected date has been removed from your swap request",
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting preferred day:', error);
      toast({
        title: "Failed to delete date",
        description: "There was a problem removing the selected date",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };
  
  const createSwapRequest = async (shiftId: string, preferredDates: { date: string, acceptedTypes: string[] }[]) => {
    if (!user || !shiftId || preferredDates.length === 0) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Create a swap request using Edge Function
      const { error } = await supabase.functions.invoke('create_swap_request', {
        body: {
          user_id: user.id,
          shift_id: shiftId,
          preferred_dates: preferredDates
        }
      });
      
      if (error) throw error;
      
      // Refresh requests after creation
      await fetchSwapRequests();
      
      toast({
        title: "Swap Request Created",
        description: "Your shift swap request has been created successfully",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating swap request:', error);
      toast({
        title: "Failed to create swap request",
        description: "There was a problem creating your swap request",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };
  
  // Fetch swap requests when the component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user]);
  
  return {
    ...state,
    fetchSwapRequests,
    createSwapRequest,
    deleteSwapRequest,
    deletePreferredDay
  };
}
