
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
      
      // Fetch the user's pending swap requests from our new table structure
      const { data: requests, error: requestsError } = await supabase
        .from('swap_requests')
        .select('id, status, shift_id, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      
      if (requestsError) throw requestsError;
      
      console.log('Raw request data:', requests);
      
      if (!requests || requests.length === 0) {
        setState({
          swapRequests: [],
          isLoading: false,
          error: null
        });
        return;
      }
      
      // Get all shift IDs to fetch in a single query
      const shiftIds = requests.map(req => req.shift_id);
      
      // Fetch all the shifts data in one query
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, date, start_time, end_time, truck_name')
        .in('id', shiftIds);
      
      if (shiftsError) throw shiftsError;
      
      // Create a map for quick lookup
      const shiftsMap: Record<string, any> = {};
      shifts?.forEach(shift => {
        shiftsMap[shift.id] = shift;
      });
      
      // Fetch all preferred days for these requests
      const requestIds = requests.map(req => req.id);
      
      const { data: preferredDays, error: daysError } = await supabase
        .from('preferred_days')
        .select('id, swap_request_id, date, accepted_types')
        .in('swap_request_id', requestIds);
      
      if (daysError) throw daysError;
      
      // Group preferred days by request ID
      const preferredDaysByRequest: Record<string, PreferredDay[]> = {};
      preferredDays?.forEach(day => {
        if (!preferredDaysByRequest[day.swap_request_id]) {
          preferredDaysByRequest[day.swap_request_id] = [];
        }
        preferredDaysByRequest[day.swap_request_id].push({
          id: day.id,
          date: day.date,
          acceptedTypes: day.accepted_types || ['day', 'afternoon', 'night']
        });
      });
      
      // Process and format the requests data
      const formattedRequests = requests.map(request => {
        const shift = shiftsMap[request.shift_id];
        
        if (!shift) {
          console.warn(`Shift not found for request ${request.id}`);
          return null;
        }
        
        return {
          id: request.id,
          status: request.status,
          originalShift: {
            id: shift.id,
            date: shift.date,
            title: shift.truck_name || 'Shift',
            startTime: shift.start_time,
            endTime: shift.end_time,
            type: getShiftType(shift.start_time)
          },
          preferredDays: preferredDaysByRequest[request.id] || []
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
  
  const createSwapRequest = async (shiftId: string, preferredDates: { date: string, acceptedTypes: string[] }[]) => {
    if (!user || !shiftId || preferredDates.length === 0) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // First create the swap request
      const { data: request, error: requestError } = await supabase
        .from('swap_requests')
        .insert({
          user_id: user.id,
          shift_id: shiftId,
          status: 'pending'
        })
        .select()
        .single();
      
      if (requestError) throw requestError;
      
      // Then create all preferred days
      const preferredDaysToInsert = preferredDates.map(pd => ({
        swap_request_id: request.id,
        date: pd.date,
        accepted_types: pd.acceptedTypes
      }));
      
      const { data: days, error: daysError } = await supabase
        .from('preferred_days')
        .insert(preferredDaysToInsert)
        .select();
      
      if (daysError) throw daysError;
      
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
  
  const deleteSwapRequest = async (requestId: string) => {
    if (!user || !requestId) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Delete the swap request (will cascade delete preferred days)
      const { error } = await supabase
        .from('swap_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', user.id);
      
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
      
      // Delete the preferred day
      const { error } = await supabase
        .from('preferred_days')
        .delete()
        .eq('id', dayId)
        .neq('id', null); // Safety check
      
      if (error) throw error;
      
      // Check if there are any preferred days left
      const { data: remainingDays, error: countError } = await supabase
        .from('preferred_days')
        .select('id')
        .eq('swap_request_id', requestId);
      
      if (countError) throw countError;
      
      // If no days left, delete the whole request
      if (!remainingDays || remainingDays.length === 0) {
        await deleteSwapRequest(requestId);
        return true;
      }
      
      // Update the local state
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
