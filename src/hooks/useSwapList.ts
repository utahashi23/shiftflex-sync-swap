import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
      // Build the query
      let query = supabase
        .from('available_swaps')
        .select('*, preferrer:user_profiles(id, name, employeeId)', { count: 'exact' })
        .eq('available', true)
        .order('date', { ascending: true });

      // Apply filters
      if (filters.day) {
        query = query.eq('day', filters.day);
      }
      if (filters.month) {
        query = query.eq('month', filters.month);
      }
      if (filters.specificDate) {
        const formattedDate = format(filters.specificDate, 'yyyy-MM-dd');
        query = query.eq('date', formattedDate);
      }
      if (filters.shiftType) {
        query = query.eq('type', filters.shiftType);
      }
      if (filters.colleagueType) {
        query = query.eq('colleagueType', filters.colleagueType);
      }

      // Initial fetch to get total count
      const { count, error: countError } = await supabase
        .from('available_swaps')
        .select('*', { count: 'exact', head: true });

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

      // Map the data to the SwapListItem interface
      const mappedData: SwapListItem[] = (data || []).map(item => ({
        id: item.id,
        preferrer: item.preferrer,
        originalShift: {
          id: item.id,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          type: item.type,
          title: item.truck,
          colleagueType: item.colleagueType,
        },
      }));

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
