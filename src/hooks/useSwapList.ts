
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format as formatDate } from 'date-fns';

// Define the filters type
export interface SwapRequestFilters {
  day: string | null;
  month: string | null;
  specificDate: Date | null;
  shiftType: string | null;
  colleagueType: string | null;
}

// Add the originalShift property to the SwapListItem interface
export interface SwapListItem {
  id: string;
  preferrer?: {
    id: string;
    name: string;
    employeeId?: string;
  };
  originalShift: {
    id: string;
    date: string;
    startTime?: string;
    endTime?: string;
    type?: string;
    title?: string;
    colleagueType?: string;
  };
  // Add other properties as needed
}

export const useSwapList = () => {
  const [swapRequests, setSwapRequests] = useState<SwapListItem[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<SwapListItem[]>([]);
  const [totalFilteredCount, setTotalFilteredCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<SwapRequestFilters>({
    day: null,
    month: null,
    specificDate: null,
    shiftType: null,
    colleagueType: null
  });
  const [page, setPage] = useState<number>(1);
  const { user } = useAuth();
  const { toast } = useToast();
  const limit = 10;

  const fetchSwapRequests = useCallback(async () => {
    if (!user) {
      setSwapRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For now, let's use shifts table directly since available_swaps is causing issues
      let query = supabase
        .from('shifts')
        .select('*, user_profiles:user_id(id, name, employeeId)', { count: 'exact' })
        .gt('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Apply filters
      if (filters.day) {
        // Extract the day from the date and filter
        query = query.filter('date', 'ilike', `%-${filters.day.padStart(2, '0')}%`);
      }
      
      if (filters.month) {
        // Extract the month from the date and filter
        query = query.filter('date', 'ilike', `%-${filters.month.padStart(2, '0')}-%`);
      }
      
      if (filters.specificDate) {
        const formattedDate = formatDate(filters.specificDate, 'yyyy-MM-dd');
        query = query.eq('date', formattedDate);
      }
      
      if (filters.shiftType) {
        // This is a simplified approach - in a real app, you might need a more sophisticated 
        // query based on start_time to determine shift type
        if (filters.shiftType === 'day') {
          query = query.lt('start_time', '12:00:00');
        } else if (filters.shiftType === 'afternoon') {
          query = query.gte('start_time', '12:00:00').lt('start_time', '18:00:00');
        } else if (filters.shiftType === 'night') {
          query = query.gte('start_time', '18:00:00');
        }
      }
      
      if (filters.colleagueType) {
        query = query.eq('colleague_type', filters.colleagueType);
      }

      // Initial fetch to get total count
      const { count, error: countError } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .gt('date', new Date().toISOString().split('T')[0]);

      if (countError) {
        throw countError;
      }

      setTotalFilteredCount(count || 0);

      // Paginated fetch
      query = query.range((page - 1) * limit, page * limit - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Map the data to the SwapListItem interface - safely handling the response
      const mappedData: SwapListItem[] = (data || []).map(item => {
        // Default user profile
        const userProfile = {
          id: item.user_id || '',
          name: 'Unknown User',
          employeeId: undefined
        };
        
        // Try to safely extract user profile info if available
        if (item.user_profiles && typeof item.user_profiles === 'object') {
          // Check if user_profiles is not null and has name property
          if (item.user_profiles && typeof item.user_profiles === 'object' && 
              'name' in (item.user_profiles as any)) {
            userProfile.name = (item.user_profiles as any).name || 'Unknown User';
          }
          
          // Check if user_profiles is not null and has employeeId property  
          if (item.user_profiles && typeof item.user_profiles === 'object' && 
              'employeeId' in (item.user_profiles as any)) {
            userProfile.employeeId = (item.user_profiles as any).employeeId;
          }
        }
        
        return {
          id: item.id,
          preferrer: userProfile,
          originalShift: {
            id: item.id,
            date: item.date,
            startTime: item.start_time,
            endTime: item.end_time,
            type: determineShiftType(item.start_time),
            title: item.truck_name,
            colleagueType: item.colleague_type,
          },
        };
      });

      // Update state
      setSwapRequests(prevRequests => (page === 1 ? mappedData : [...prevRequests, ...mappedData]));
      setFilteredRequests(prevRequests => (page === 1 ? mappedData : [...prevRequests, ...mappedData]));
      setHasMore(mappedData.length === limit && (count || 0) > page * limit);

    } catch (err: any) {
      console.error('Error fetching swap requests:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load swap requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, filters, page, limit, toast]);

  // Helper function to determine shift type based on start time
  function determineShiftType(startTime?: string): string {
    if (!startTime) return 'day';
    
    const hour = parseInt(startTime.split(':')[0], 10);
    if (hour < 12) return 'day';
    if (hour < 18) return 'afternoon';
    return 'night';
  }

  useEffect(() => {
    setPage(1); // Reset page to 1 when filters change
    setSwapRequests([]); // Clear existing requests
    setFilteredRequests([]);
    fetchSwapRequests();
  }, [filters, fetchSwapRequests]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage(prevPage => prevPage + 1);
    }
  };

  const handleOfferSwap = (requestId: string) => {
    toast({
      title: "Shift Swap Offered",
      description: `You have offered a shift swap for request ID: ${requestId}`,
    });
  };

  const refreshRequests = () => {
    setPage(1);
    fetchSwapRequests();
  };

  return {
    swapRequests,
    filteredRequests,
    totalFilteredCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    filters,
    setFilters,
    handleOfferSwap,
    loadMore,
    refreshRequests
  };
};
