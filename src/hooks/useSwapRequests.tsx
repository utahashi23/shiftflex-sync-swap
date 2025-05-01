
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SwapRequest {
  id: string;
  status: string;
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: string; // Adding the missing type field
  };
  preferredDays: PreferredDay[];
  createdAt?: string;
}

export interface PreferredDay {
  id: string;
  date: string;
  acceptedTypes: string[];
}

export function useSwapRequests() {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { user } = useAuth();
  
  const fetchSwapRequests = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Call the Edge Function to get user swap requests
      const { data, error } = await supabase.functions.invoke('get_swap_requests', {
        body: { user_id: user.id, status: 'pending' }
      });
      
      if (error) throw new Error(error.message);
      
      // Process and set swap requests
      // Map the response data to ensure each shift has a type based on start time
      const processedRequests = (data || []).map(request => {
        const shift = request.shift;
        
        // Determine shift type based on start time if not provided
        if (shift && !shift.type) {
          const startHour = new Date(`2000-01-01T${shift.startTime}`).getHours();
          if (startHour <= 8) {
            shift.type = 'day';
          } else if (startHour > 8 && startHour < 16) {
            shift.type = 'afternoon';
          } else {
            shift.type = 'night';
          }
        }
        
        // Ensure preferred_days is properly mapped to preferredDays
        const preferredDays = (request.preferred_days || []).map(day => ({
          id: day.id,
          date: day.date,
          acceptedTypes: day.accepted_types || []
        }));
        
        return {
          ...request,
          shift: shift,
          preferredDays: preferredDays
        };
      });
      
      setSwapRequests(processedRequests);
      
    } catch (error: any) {
      console.error('Error fetching swap requests:', error);
      setError(error);
      toast({
        title: "Failed to load swap requests",
        description: "There was a problem loading your swap requests",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteSwapRequest = async (requestId: string) => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      
      // Call the Edge Function to delete the swap request
      const { data, error } = await supabase.functions.invoke('delete_swap_request', {
        body: { request_id: requestId }
      });
      
      if (error) throw new Error(error.message);
      
      // Remove the deleted request from the state
      setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Request Deleted",
        description: "Your swap request has been deleted",
      });
      
      return true;
    } catch (error: any) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Failed to delete request",
        description: "There was a problem deleting your swap request",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const deletePreferredDay = async (dayId: string, requestId: string) => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      
      // Call the Edge Function to delete the preferred day
      const { data, error } = await supabase.functions.invoke('delete_preferred_day', {
        body: { day_id: dayId, request_id: requestId }
      });
      
      if (error) throw new Error(error.message);
      
      // Update the local state to reflect the deletion
      setSwapRequests(prev => prev.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            preferredDays: req.preferredDays.filter(day => day.id !== dayId)
          };
        }
        return req;
      }));
      
      // If no preferred days remain, the request itself might have been deleted by the backend
      // Check if we need to remove the request from our state
      const { data: checkRequest, error: checkError } = await supabase
        .from('shift_swap_requests')
        .select('id')
        .eq('id', requestId)
        .single();
      
      if (!checkRequest || checkError) {
        // Request is gone, remove it from our state
        setSwapRequests(prev => prev.filter(req => req.id !== requestId));
      }
      
      toast({
        title: "Date Removed",
        description: "The preferred date has been removed",
      });
      
      return true;
    } catch (error: any) {
      console.error('Error deleting preferred day:', error);
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
  
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user]);
  
  return {
    swapRequests,
    isLoading,
    error,
    fetchSwapRequests,
    deleteSwapRequest,
    deletePreferredDay
  };
}
