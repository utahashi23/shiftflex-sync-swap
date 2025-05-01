
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ExtendedUser } from '@/hooks/useAuth';
import { Shift } from '@/hooks/useShiftData';

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
  const [stats, setStats] = useState<DashboardStats>({
    totalShifts: 0,
    activeSwaps: 0,
    matchedSwaps: 0,
    completedSwaps: 0,
    upcomingShifts: [],
    recentActivity: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Fetch the user's shifts
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });
          
        if (shiftsError) throw shiftsError;
        
        // Fetch swap requests where the user is the requester
        const { data: swapRequests, error: swapRequestsError } = await supabase
          .from('shift_swap_requests')
          .select('*')
          .eq('requester_id', user.id);
          
        if (swapRequestsError) throw swapRequestsError;
        
        // Fetch swap requests where the user is the acceptor
        const { data: swapAccepts, error: swapAcceptsError } = await supabase
          .from('shift_swap_requests')
          .select('*')
          .eq('acceptor_id', user.id);
          
        if (swapAcceptsError) throw swapAcceptsError;
        
        // Format the shifts for display
        const upcomingShifts = shiftsData?.map(shift => {
          // Create a title from the truck name or use a default
          const title = shift.truck_name ? shift.truck_name : `Shift-${shift.id.substring(0, 5)}`;
          
          // Determine the shift type based on start time
          let type: 'day' | 'afternoon' | 'night' = 'day';
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour <= 8) {
            type = 'day';
          } else if (startHour > 8 && startHour < 16) {
            type = 'afternoon';
          } else {
            type = 'night';
          }
          
          return {
            id: shift.id,
            date: shift.date,
            title,
            startTime: shift.start_time.substring(0, 5), // Format as HH:MM
            endTime: shift.end_time.substring(0, 5),     // Format as HH:MM
            type
          };
        }) || [];
        
        // Count the different types of swap requests
        // Only count requests with preferred dates as "active"
        const activeSwaps = swapRequests?.filter(
          req => req.status === 'pending' && req.preferred_dates_count > 0
        ).length || 0;
        
        const matchedSwaps = swapRequests?.filter(req => req.status === 'matched').length || 0;
        const completedSwaps = swapRequests?.filter(req => req.status === 'completed').length || 0;
        
        // Combine all swap requests for activity feed
        const allSwaps = [...(swapRequests || []), ...(swapAccepts || [])];
        
        // Sort by created_at date (newest first)
        allSwaps.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Format the recent activity
        const recentActivity = allSwaps.slice(0, 5).map(swap => {
          let action = "";
          let status = swap.status;
          
          if (swap.requester_id === user.id) {
            action = "Created swap request";
          } else {
            action = "Received swap request";
          }
          
          // Try to get the shift title from our shifts
          const shiftInfo = shiftsData?.find(s => s.id === swap.requester_shift_id);
          const shift = shiftInfo ? 
            (shiftInfo.truck_name || `Shift-${shiftInfo.id.substring(0, 5)}`) : 
            `Unknown Shift`;
          
          return {
            id: swap.id,
            date: new Date(swap.created_at).toISOString().split('T')[0],
            action,
            shift,
            status: status.charAt(0).toUpperCase() + status.slice(1) // Capitalize the first letter
          };
        });
        
        setStats({
          totalShifts: shiftsData?.length || 0,
          activeSwaps,
          matchedSwaps,
          completedSwaps,
          upcomingShifts: upcomingShifts.slice(0, 4), // Limit to 4 upcoming shifts
          recentActivity
        });
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
  }, [user]);

  return { stats, isLoading };
};
