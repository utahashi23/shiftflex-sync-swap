
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSession } from '@/hooks/useSession';
import AppLayout from '@/layouts/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import RecentActivity from '@/components/dashboard/RecentActivity';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import UserCount from '@/components/stats/UserCount'; 

const Dashboard = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user } = useAuth();
  const { sessionTimeLeft } = useSession();
  const { stats } = useDashboardData();

  useEffect(() => {
    // Analytics or other side effects
  }, [user]);

  return (
    <AppLayout>
      <div className="flex flex-col">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.email || 'User'}!
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
          <StatCard 
            title="Managed Shifts" 
            value={stats.totalShifts} 
            description="Total shifts in your roster" 
            icon="calendar" 
          />
          <StatCard 
            title="Swap Requests" 
            value={stats.swapRequests} 
            description="Pending swap requests" 
            icon="refresh-cw" 
            trend={stats.swapRequestsTrend} 
          />
          <StatCard 
            title="Upcoming Shifts" 
            value={stats.upcomingShifts} 
            description="Next 7 days" 
            icon="calendar-clock" 
          />
          <UserCount />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <UpcomingShifts />
          <RecentActivity />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
