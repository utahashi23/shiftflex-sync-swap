
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';

// Import refactored components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardDebug from '@/components/dashboard/DashboardDebug';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import RecentActivity from '@/components/dashboard/RecentActivity';

const Dashboard = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user } = useAuth();
  const { stats, isLoading } = useDashboardData(user);
  const { 
    totalUsers, 
    isLoadingUsers 
  } = useDashboardSummary();

  return (
    <AppLayout>
      <DashboardHeader 
        totalUsers={totalUsers}
        isLoadingUsers={isLoadingUsers}
      />

      <DashboardStats 
        stats={stats} 
        isLoading={isLoading} 
      />

      {/* Debug panel is hidden */}
      <DashboardDebug isVisible={false} />

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
