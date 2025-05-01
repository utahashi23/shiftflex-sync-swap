import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Clock, Repeat, Check, Calendar, CalendarClock, Users, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Import refactored components
import StatCard from '@/components/dashboard/StatCard';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { useDashboardData } from '@/hooks/useDashboardData';

const Dashboard = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const { stats, isLoading } = useDashboardData(user);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [totalActiveSwaps, setTotalActiveSwaps] = useState<number>(0);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState<boolean>(true);
  
  // Test data for debugging
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [allPreferredDates, setAllPreferredDates] = useState<any[]>([]);
  const [isLoadingTestData, setIsLoadingTestData] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserCount = async () => {
      setIsLoadingUsers(true);
      try {
        // Use a count query without any filters to get all profiles
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error('Error fetching user count:', error);
        } else {
          console.log('Total profiles count:', count);
          setTotalUsers(count || 0);
        }
      } catch (error) {
        console.error('Error fetching user count:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const fetchTotalActiveSwaps = async () => {
      setIsLoadingSwaps(true);
      try {
        // Get total count of active swap requests (pending with preferred dates)
        const { count, error } = await supabase
          .from('shift_swap_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gt('preferred_dates_count', 0);
          
        if (error) {
          console.error('Error fetching active swap requests count:', error);
        } else {
          console.log('Total active swap requests:', count);
          setTotalActiveSwaps(count || 0);
        }
      } catch (error) {
        console.error('Error fetching active swap requests count:', error);
      } finally {
        setIsLoadingSwaps(false);
      }
    };

    // Debug function to fetch all shifts and preferred dates
    const fetchTestData = async () => {
      setIsLoadingTestData(true);
      try {
        // Exclude admin user ID from queries
        const ADMIN_USER_ID = '7c31ceb6-bec9-4ea8-b65a-b6629547b52e';
        
        // Fetch ALL shifts
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .neq('user_id', ADMIN_USER_ID);
          
        if (shiftsError) {
          console.error('Error fetching all shifts:', shiftsError);
        } else {
          console.log('DEBUG - All shifts in database:', shiftsData);
          setAllShifts(shiftsData || []);
        }
        
        // Fetch ALL preferred dates
        const { data: datesData, error: datesError } = await supabase
          .from('shift_swap_preferred_dates')
          .select('*');
          
        if (datesError) {
          console.error('Error fetching all preferred dates:', datesError);
        } else {
          console.log('DEBUG - All preferred dates in database:', datesData);
          setAllPreferredDates(datesData || []);
        }
      } catch (error) {
        console.error('Error fetching test data:', error);
      } finally {
        setIsLoadingTestData(false);
      }
    };

    fetchUserCount();
    fetchTotalActiveSwaps();
    fetchTestData(); // Add the debug function call
  }, []);

  return (
    <AppLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {user?.user_metadata?.first_name || 'User'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-secondary/60 px-4 py-2 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <span className="text-sm text-gray-500">Total Users</span>
              <p className="font-medium">{isLoadingUsers ? '...' : totalUsers}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/60 px-4 py-2 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <span className="text-sm text-gray-500">All Active Requests</span>
              <p className="font-medium">{isLoadingSwaps ? '...' : totalActiveSwaps}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="My Total Rostered Shifts"
          value={stats.totalShifts}
          description="For the current month"
          icon={<CalendarClock className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        
        <StatCard 
          title="My Active Swap Requests"
          value={stats.activeSwaps}
          description="Pending approval or match"
          icon={<Repeat className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        
        <StatCard 
          title="My Matched Swaps"
          value={stats.matchedSwaps}
          description="Ready for approval"
          icon={<Clock className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        
        <StatCard 
          title="My Completed Swaps"
          value={stats.completedSwaps}
          description="Successfully exchanged"
          icon={<Check className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
      </div>

      {/* Debug Test Block - Will be removed after testing */}
      <div className="mb-8 p-4 border border-red-300 bg-red-50 rounded-lg">
        <h2 className="text-lg font-bold text-red-700 mb-2">DEBUG DATA (Will be removed)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">All Shifts ({allShifts.length})</h3>
            {isLoadingTestData ? (
              <p>Loading shifts data...</p>
            ) : (
              <div className="max-h-40 overflow-y-auto text-xs">
                <pre>{JSON.stringify(allShifts.map(s => ({
                  id: s.id.substring(0, 8),
                  user_id: s.user_id.substring(0, 8),
                  date: s.date,
                  start: s.start_time
                })), null, 2)}</pre>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold">All Preferred Dates ({allPreferredDates.length})</h3>
            {isLoadingTestData ? (
              <p>Loading preferred dates data...</p>
            ) : (
              <div className="max-h-40 overflow-y-auto text-xs">
                <pre>{JSON.stringify(allPreferredDates.map(d => ({
                  id: d.id.substring(0, 8),
                  request_id: d.request_id.substring(0, 8),
                  date: d.date,
                  types: d.accepted_types
                })), null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UpcomingShifts 
          shifts={stats.upcomingShifts} 
          isLoading={isLoading} 
        />
        
        <RecentActivity 
          activities={stats.recentActivity} 
          isLoading={isLoading} 
        />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
