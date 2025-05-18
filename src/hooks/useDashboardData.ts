
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ExtendedUser } from '@/hooks/useAuth';
import { Shift, validateColleagueType } from '@/hooks/useShiftData';
import { getShiftType } from '@/utils/shiftUtils';
import { useSwapMatcher } from './swap-matching';

export interface Activity {
  id: string;
  date: string;
  action: string;
  shift: string;
  status: string;
}

export interface DashboardStats {
  totalShifts: number;
  activeSwaps: number;
  matchedSwaps: number;
  completedSwaps: number;
  upcomingShifts: Shift[];
  recentActivity: Activity[];
}

export const useDashboardData = (user: ExtendedUser | null) => {
  const [isLoading, setIsLoading] = useState(true);
  const { findSwapMatches } = useSwapMatcher();
  const [stats, setStats] = useState<DashboardStats>({
    totalShifts: 0,
    activeSwaps: 0,
    matchedSwaps: 0,
    completedSwaps: 0,
    upcomingShifts: [],
    recentActivity: []
  });
  
  // Use a ref to prevent unnecessary data fetching
  const fetchedRef = useRef(false);
  // Add a userId ref to track user changes
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Prevent refetching if we've already fetched data for this user
      if (fetchedRef.current && userIdRef.current === user.id) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        console.log('Fetching dashboard data for user:', user.id);
        // Store the current userId to prevent unnecessary refetches
        userIdRef.current = user.id;
        
        // Fetch the user's shifts
        const { data: shiftsData, error: shiftsError } = await supabase
          .rpc('get_all_shifts');
          
        if (shiftsError) {
          console.error('Error fetching shifts:', shiftsError);
          throw shiftsError;
        }
        
        // Filter shifts for current user
        const userShifts = shiftsData?.filter(shift => shift.user_id === user.id) || [];
        console.log(`Found ${userShifts.length} shifts for user`);
        
        // Fetch swap requests where the user is the requester
        const { data: swapRequests, error: swapRequestsError } = await supabase
          .rpc('get_all_swap_requests');
          
        if (swapRequestsError) {
          console.error('Error fetching swap requests:', swapRequestsError);
          throw swapRequestsError;
        }
        
        // Filter requests for current user
        const userRequests = swapRequests?.filter(req => req.requester_id === user.id) || [];
        console.log(`Found ${userRequests.length} swap requests for user`);
        
        // Use our new function to get matches - this avoids the RLS recursion issue
        const matches = await findSwapMatches(user.id, false, false);
        console.log('Found potential matches:', matches);
        
        // Count matched swaps (both 'accepted' and 'other_accepted' status)
        const matchedSwapsCount = matches?.matches?.filter((match: any) => 
          match.match_status === 'accepted' || 
          match.match_status === 'other_accepted'
        ).length || 0;
        
        console.log(`Found ${matchedSwapsCount} matched swaps for user`);
        
        // Count the different types of swap requests
        const activeRequestsIds = userRequests
          .filter(req => req.status === 'pending' && req.preferred_dates_count > 0)
          .map(req => req.id);
        
        // Determine active swap requests by filtering out any that are in accepted matches
        const matchedRequestIds = new Set(
          (matches?.matches || [])
            .filter((match: any) => 
              match.match_status === 'accepted' || 
              match.match_status === 'other_accepted'
            )
            .flatMap((match: any) => [match.my_request_id, match.other_request_id])
        );
        
        // Count active swaps (pending requests that have preferred dates and aren't matched yet)
        const activeSwaps = activeRequestsIds.filter(id => !matchedRequestIds.has(id)).length;
        
        // Count completed swaps
        const completedSwaps = userRequests.filter(req => req.status === 'completed').length || 0;
        
        // Format the upcoming shifts for display
        const upcomingShifts = userShifts.map(shift => {
          // Create a title from the truck name or use a default
          const title = shift.truck_name ? shift.truck_name : `Shift-${shift.id.substring(0, 5)}`;
          
          // Determine the shift type using our common utility
          const type = getShiftType(shift.start_time);
          
          // Validate colleagueType to ensure it matches the union type
          const colleagueType = validateColleagueType(shift.colleague_type);
          
          return {
            id: shift.id,
            date: shift.date,
            title,
            startTime: shift.start_time.substring(0, 5), // Format as HH:MM
            endTime: shift.end_time.substring(0, 5),     // Format as HH:MM
            type,
            colleagueType
          };
        });
        
        // Sort upcoming shifts by date
        upcomingShifts.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Format the recent activity (up to 5 items)
        const recentActivity: Activity[] = userRequests
          .slice(0, 5)
          .map(swap => {
            // Try to get the shift title from our shifts
            const shiftInfo = userShifts.find(s => s.id === swap.requester_shift_id);
            const shift = shiftInfo ? 
              (shiftInfo.truck_name || `Shift-${shiftInfo.id.substring(0, 5)}`) : 
              `Unknown Shift`;
            
            return {
              id: swap.id,
              date: new Date(swap.created_at).toISOString().split('T')[0],
              action: "Created swap request",
              shift,
              status: swap.status.charAt(0).toUpperCase() + swap.status.slice(1) // Capitalize the first letter
            };
          });
        
        setStats({
          totalShifts: userShifts.length || 0,
          activeSwaps,
          matchedSwaps: matchedSwapsCount,
          completedSwaps,
          upcomingShifts: upcomingShifts.slice(0, 4), // Limit to 4 upcoming shifts
          recentActivity
        });
        
        // Mark as fetched to prevent continuous refetching
        fetchedRef.current = true;
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error loading dashboard",
          description: "Could not load your dashboard data. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    
    // No cleanup function to reset fetchedRef since we want to maintain the cache
    // across component re-renders
  }, [user, findSwapMatches]);

  return { stats, isLoading };
};
