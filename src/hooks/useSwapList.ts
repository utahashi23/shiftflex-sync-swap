
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllSwapRequests } from '@/utils/rls-bypass';
import { format, isMatch } from 'date-fns';
import { createSwapMatchSafe } from '@/utils/rls-helpers';
import { SwapRequest, PreferredDate } from '@/hooks/swap-requests/types';

export interface SwapFilters {
  day: number | null;
  month: number | null;
  specificDate: string | null;
  shiftType: string | null;
  colleagueType: string | null;
}

export interface SwapListItem extends SwapRequest {
  preferrer?: {
    name: string;
    employeeId?: string;
  }
}

export const useSwapList = () => {
  const { user, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allSwapRequests, setAllSwapRequests] = useState<SwapListItem[]>([]);
  const [displayedRequests, setDisplayedRequests] = useState<SwapListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState<SwapFilters>({
    day: null,
    month: null,
    specificDate: null,
    shiftType: null,
    colleagueType: null
  });

  // Fetch all pending swap requests
  const fetchAllRequests = async () => {
    setIsLoading(true);
    try {
      if (!user) return;

      // Important: For all users, use the RLS bypass function to get all requests
      // This should return ALL pending requests regardless of user permissions
      const { data, error } = await fetchAllSwapRequests();
      
      if (error) throw error;
      
      // Helper function for getting requester profile
      const getRequesterProfile = async (userId: string) => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, employee_id')
            .eq('id', userId)
            .maybeSingle(); // Using maybeSingle() to prevent errors if profile not found
            
          return profile ? {
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
            employeeId: profile.employee_id
          } : { name: 'Unknown User' };
        } catch (error) {
          console.error('Error fetching profile:', error);
          return { name: 'Unknown User' };
        }
      };
      
      if (!data || data.length === 0) {
        console.log('No swap requests found');
        setAllSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Map raw data to our SwapRequest format
      const formattedRequests = data
        .filter((req: any) => req.status === 'pending')
        .map((req: any) => {
          // Get the embedded shift data
          const shift = req._embedded_shift || {};
          
          // Format preferred dates
          const preferredDates = (req.preferred_dates || []).map((date: any) => ({
            id: date.id,
            date: date.date,
            acceptedTypes: date.accepted_types || []
          }));
          
          // Determine shift type from start time
          const startHour = shift.start_time ? parseInt(shift.start_time.split(':')[0]) : 8;
          let shiftType = 'day';
          if (startHour >= 16) shiftType = 'night';
          else if (startHour >= 12) shiftType = 'afternoon';
          
          return {
            id: req.id,
            status: req.status,
            requesterId: req.requester_id,
            originalShift: {
              id: shift.id || '',
              date: shift.date || '',
              title: shift.truck_name || `Shift-${(shift.id || '').substring(0, 5)}`,
              startTime: shift.start_time ? shift.start_time.substring(0, 5) : '',
              endTime: shift.end_time ? shift.end_time.substring(0, 5) : '',
              type: shiftType,
              colleagueType: shift.colleague_type || 'Unknown'
            },
            preferredDates: preferredDates
          };
        });
        
      // Get requester profiles for each request
      const requestsWithProfiles = await Promise.all(
        formattedRequests.map(async (req) => {
          try {
            const profile = await getRequesterProfile(req.requesterId);
            return {
              ...req,
              preferrer: profile
            };
          } catch (error) {
            console.error(`Error fetching profile for request ${req.id}:`, error);
            return {
              ...req,
              preferrer: { name: 'Unknown User' }
            };
          }
        })
      );
      
      console.log('Total swap requests fetched:', requestsWithProfiles.length);
      setAllSwapRequests(requestsWithProfiles);
      
      // Reset pagination
      setPage(1);
      setHasMore(requestsWithProfiles.length > itemsPerPage);
      
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast({
        title: "Failed to load swap requests",
        description: "There was a problem loading the swap requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter requests based on user's filter selection
  const filteredRequests = useMemo(() => {
    return allSwapRequests.filter(request => {
      const originalDate = new Date(request.originalShift.date);
      
      // Filter by day
      if (filters.day !== null && originalDate.getDate() !== filters.day) {
        return false;
      }
      
      // Filter by month
      if (filters.month !== null && originalDate.getMonth() !== filters.month - 1) { // JS months are 0-indexed
        return false;
      }
      
      // Filter by specific date
      if (filters.specificDate && request.originalShift.date !== filters.specificDate) {
        return false;
      }
      
      // Filter by shift type
      if (filters.shiftType && request.originalShift.type !== filters.shiftType) {
        return false;
      }
      
      // Filter by colleague type
      if (filters.colleagueType && request.originalShift.colleagueType !== filters.colleagueType) {
        return false;
      }
      
      return true;
    });
  }, [allSwapRequests, filters]);
  
  // Update displayed items when filters change or on initial load
  useEffect(() => {
    const initialItems = filteredRequests.slice(0, itemsPerPage);
    setDisplayedRequests(initialItems);
    setHasMore(filteredRequests.length > itemsPerPage);
    setPage(1);
  }, [filteredRequests]);

  // Function to load more items when scrolling
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    
    // Calculate next page of items
    const nextPage = page + 1;
    const startIndex = (nextPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const nextItems = filteredRequests.slice(startIndex, endIndex);
    
    // Add new items to displayed items
    setDisplayedRequests(prev => [...prev, ...nextItems]);
    setPage(nextPage);
    setHasMore(endIndex < filteredRequests.length);
    
    setIsLoadingMore(false);
  }, [filteredRequests, page, isLoadingMore, hasMore, itemsPerPage]);

  useEffect(() => {
    if (user) {
      fetchAllRequests();
    }
  }, [user]);

  // Handle offering a swap
  const handleOfferSwap = async (requestId: string) => {
    try {
      // This will be implemented in a future feature
      toast({
        title: "Offer swap feature coming soon",
        description: "This feature is currently being developed."
      });
      
      // In the future, we'll create a new swap match here
    } catch (error) {
      console.error('Error offering swap:', error);
      toast({
        title: "Failed to offer swap",
        description: "There was a problem offering the swap. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    swapRequests: allSwapRequests,
    isLoading,
    isLoadingMore,
    filteredRequests: displayedRequests,
    totalFilteredCount: filteredRequests.length,
    filters,
    setFilters,
    refreshRequests: fetchAllRequests,
    handleOfferSwap,
    loadMore,
    hasMore
  };
};
