
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Clock, Repeat, Check, Calendar, CalendarClock, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Import refactored components
import StatCard from '@/components/dashboard/StatCard';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { useDashboardData } from '@/hooks/useDashboardData';

const Dashboard = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user } = useAuth();
  const { stats, isLoading } = useDashboardData(user);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserCount = async () => {
      setIsLoadingUsers(true);
      try {
        // Use a simple count query to get the total number of profiles
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

    fetchUserCount();
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
        <div className="flex items-center gap-2 bg-secondary/60 px-4 py-2 rounded-lg">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <span className="text-sm text-gray-500">Total Users</span>
            <p className="font-medium">{isLoadingUsers ? '...' : totalUsers}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Rostered Shifts"
          value={stats.totalShifts}
          description="For the current month"
          icon={<CalendarClock className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        
        <StatCard 
          title="Active Swap Requests"
          value={stats.activeSwaps}
          description="Pending approval or match"
          icon={<Repeat className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        
        <StatCard 
          title="Matched Swaps"
          value={stats.matchedSwaps}
          description="Ready for approval"
          icon={<Clock className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
        
        <StatCard 
          title="Completed Swaps"
          value={stats.completedSwaps}
          description="Successfully exchanged"
          icon={<Check className="h-5 w-5 text-primary" />}
          isLoading={isLoading}
        />
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
