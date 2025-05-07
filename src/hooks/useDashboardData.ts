
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ExtendedUser } from '@/hooks/useAuth';
import { Shift, validateColleagueType } from '@/hooks/useShiftData';
import { getShiftType } from '@/utils/shiftUtils';

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

// Default empty stats to avoid null/undefined errors
const defaultStats: DashboardStats = {
  totalShifts: 0,
  activeSwaps: 0,
  matchedSwaps: 0,
  completedSwaps: 0,
  upcomingShifts: [],
  recentActivity: []
};

export const useDashboardData = (user: ExtendedUser | null) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        console.log('No user provided to useDashboardData, skipping data fetch');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      console.log('Starting dashboard data fetch for user:', user.id);
      
      try {
        // First, test database connection
        const { data: connectionTest, error: connectionError } = await supabase
          .from('shifts')
          .select('count(*)', { count: 'exact', head: true });
          
        if (connectionError) {
          console.error('Database connection test failed:', connectionError);
          throw new Error(`Database connection error: ${connectionError.message}`);
        }
        
        console.log('Database connection successful, proceeding with data fetch');
        
        // Fetch the user's shifts with detailed logging
        console.log('Fetching shifts for user:', user.id);
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', user.id);
          
        if (shiftsError) {
          console.error('Error fetching shifts:', shiftsError);
          throw new Error(`Error fetching shifts: ${shiftsError.message}`);
        }
        
        const userShifts = shiftsData || [];
        console.log(`Found ${userShifts.length} shifts for user ${user.id}`);
        
        // Fetch swap requests where the user is the requester
        console.log('Fetching swap requests for user:', user.id);
        const { data: swapRequests, error: swapRequestsError } = await supabase
          .from('shift_swap_requests')
          .select('*')
          .eq('requester_id', user.id);
          
        if (swapRequestsError) {
          console.error('Error fetching swap requests:', swapRequestsError);
          throw new Error(`Error fetching swap requests: ${swapRequestsError.message}`);
        }
        
        const userRequests = swapRequests || [];
        console.log(`Found ${userRequests.length} swap requests for user ${user.id}`);
        
        // Format the shifts for display
        const upcomingShifts = userShifts.map(shift => {
          const title = shift.truck_name ? shift.truck_name : `Shift-${shift.id.substring(0, 5)}`;
          const type = getShiftType(shift.start_time);
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
        
        // Count the different types of swap requests
        const activeSwaps = userRequests.filter(
          req => req.status === 'pending' && req.preferred_dates_count > 0
        ).length || 0;
        
        const matchedSwaps = userRequests.filter(req => req.status === 'matched').length || 0;
        const completedSwaps = userRequests.filter(req => req.status === 'completed').length || 0;
        
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
        
        // Set the stats with the fetched data
        console.log('Setting dashboard stats with fetched data');
        
        setStats({
          totalShifts: userShifts.length || 0,
          activeSwaps,
          matchedSwaps,
          completedSwaps,
          upcomingShifts: upcomingShifts.slice(0, 4), // Limit to 4 upcoming shifts
          recentActivity
        });

        console.log('Dashboard data loaded successfully:', {
          shiftsCount: userShifts.length || 0,
          upcomingShifts: upcomingShifts.length || 0,
          activities: recentActivity.length || 0,
          activeSwaps,
          matchedSwaps,
          completedSwaps
        });
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error loading dashboard",
          description: error.message || "Could not load your dashboard data. Please try again later.",
          variant: "destructive"
        });
        // Set default values to avoid rendering errors
        setStats(defaultStats);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return { stats, isLoading };
};
