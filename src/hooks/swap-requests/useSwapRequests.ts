import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../useAuth';
import { useSwapMatches } from '../swap-matches';
import { toast } from '../use-toast';
import { createSwapRequestApi } from './createSwapRequest';
import { supabase } from '@/integrations/supabase/client';
import { deletePreferredDateApi } from './deletePreferredDate';

export function useSwapRequests() {
  const [isLoading, setIsLoading] = useState(false);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const { user } = useAuth();
  const { 
    matches: activeMatches,
    pastMatches,
    isLoading: matchesLoading,
    fetchMatches,
    acceptMatch,
    cancelMatch,
    completeMatch
  } = useSwapMatches();

  const matches = activeMatches || [];
  
  const fetchSwapRequests = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log("useSwapRequests: Fetching swap requests for user", user.id);
      
      // Query directly from improved_shift_swaps table
      const { data, error } = await supabase
        .from('improved_shift_swaps')
        .select(`
          *,
          shifts(*)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
        
      if (error) {
        throw error;
      }
      
      console.log("useSwapRequests: Got swap requests:", data?.length || 0);
      setSwapRequests(data || []);
      return data;
      
    } catch (error) {
      console.error("Error fetching swap requests:", error);
      toast({
        title: "Error",
        description: "Could not load swap requests",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  const deleteSwapRequest = useCallback(async (requestId: string) => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      console.log("useSwapRequests: Deleting swap request", requestId);
      
      // Delete from improved_shift_swaps first
      const { error } = await supabase
        .from('improved_shift_swaps')
        .delete()
        .eq('id', requestId);
        
      if (error) throw error;
      
      // Also delete related wanted dates
      const { error: datesError } = await supabase
        .from('improved_swap_wanted_dates')
        .delete()
        .eq('swap_id', requestId);
        
      if (datesError) {
        console.warn("Could not delete related wanted dates:", datesError);
      }
      
      // Update local state
      setSwapRequests(prev => prev.filter(r => r.id !== requestId));
      
      return true;
    } catch (error) {
      console.error("Error deleting swap request:", error);
      toast({
        title: "Error",
        description: "Could not delete swap request",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  const deletePreferredDay = useCallback(async (dayId: string, requestId: string) => {
    if (!user) return { success: false };
    
    try {
      setIsLoading(true);
      console.log("useSwapRequests: Deleting preferred date", dayId, "from request", requestId);
      
      const result = await deletePreferredDateApi(dayId, requestId);
      
      // If this was the last preferred date and the entire request was deleted
      if (result.requestDeleted) {
        setSwapRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        // Otherwise update the request in the list to remove the date
        // For improved_shift_swaps, we just need to refetch
        await fetchSwapRequests();
      }
      
      return result;
    } catch (error) {
      console.error("Error deleting preferred date:", error);
      toast({
        title: "Error",
        description: "Could not delete preferred date",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchSwapRequests]);
  
  const createSwapRequest = useCallback(async (shiftIds: string[], wantedDates: string[], acceptedTypes: string[]) => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      console.log("useSwapRequests: Creating swap request", { shiftIds, wantedDates, acceptedTypes });
      
      // Format dates for API
      const preferredDates = wantedDates.map(date => ({
        date,
        acceptedTypes
      }));
      
      const result = await createSwapRequestApi(shiftIds, preferredDates);
      
      // Refresh the list after creating
      if (result.success) {
        await fetchSwapRequests();
      }
      
      return result.success;
    } catch (error) {
      console.error("Error creating swap request:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchSwapRequests]);
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (user) {
      fetchSwapRequests();
    }
  }, [user, fetchSwapRequests]);
  
  const refreshMatches = useCallback(() => {
    if (user) {
      fetchMatches();
    }
  }, [user, fetchMatches]);
  
  return {
    swapRequests,
    matches,
    pastMatches,
    isLoading: isLoading || matchesLoading,
    fetchSwapRequests,
    deleteSwapRequest,
    createSwapRequest,
    deletePreferredDay,  // Add the deletePreferredDay function to the hook's return value
    refreshMatches,
    handleAcceptSwap: acceptMatch,
    handleCancelSwap: cancelMatch,
    handleMarkComplete: completeMatch
  };
}
