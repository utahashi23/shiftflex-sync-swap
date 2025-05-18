
import { useAuth } from '@/hooks/auth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { memo } from 'react';

// Import refactored components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardDebug from '@/components/dashboard/DashboardDebug';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import RecentActivity from '@/components/dashboard/RecentActivity';

// Memo-ize components to prevent unnecessary re-renders
const MemoizedDashboardStats = memo(DashboardStats);
const MemoizedUpcomingShifts = memo(UpcomingShifts);
const MemoizedRecentActivity = memo(RecentActivity);

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
      <div className="flex justify-between items-center mb-4">
        <DashboardHeader 
          totalUsers={totalUsers}
          isLoadingUsers={isLoadingUsers}
        />
      </div>

      <MemoizedDashboardStats 
        stats={stats} 
        isLoading={isLoading} 
      />

      {/* Debug panel is hidden */}
      <DashboardDebug isVisible={false} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MemoizedUpcomingShifts 
          shifts={stats.upcomingShifts} 
          isLoading={isLoading} 
        />
        
        <MemoizedRecentActivity 
          activities={stats.recentActivity} 
          isLoading={isLoading} 
        />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
