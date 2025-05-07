
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useEffect } from 'react';

// Import refactored components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardDebug from '@/components/dashboard/DashboardDebug';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import RecentActivity from '@/components/dashboard/RecentActivity';

const Dashboard = () => {
  // Use isAuthenticated from useAuthRedirect
  const { isAuthenticated } = useAuthRedirect({ protectedRoute: true });
  const { user, authChecked } = useAuth();
  const { stats, isLoading } = useDashboardData(user);
  const { 
    totalUsers, 
    isLoadingUsers, 
    totalActiveSwaps, 
    isLoadingSwaps 
  } = useDashboardSummary();

  useEffect(() => {
    // Log authentication and data loading status
    if (authChecked) {
      console.log('Auth checked, user:', user ? 'logged in' : 'not logged in');
    }
  }, [authChecked, user]);

  // Enhanced debug logging for data visibility
  useEffect(() => {
    if (!isLoading) {
      console.log('Dashboard data loaded:', {
        shiftsCount: stats.totalShifts,
        upcomingShifts: stats.upcomingShifts?.length || 0,
        activities: stats.recentActivity?.length || 0
      });
    }
    
    if (!isLoadingUsers && !isLoadingSwaps) {
      console.log('Summary data loaded:', {
        totalUsers,
        totalActiveSwaps
      });
    }
  }, [isLoading, isLoadingUsers, isLoadingSwaps, stats, totalUsers, totalActiveSwaps]);

  return (
    <AppLayout>
      <DashboardHeader 
        totalUsers={totalUsers}
        totalActiveSwaps={totalActiveSwaps}
        isLoadingUsers={isLoadingUsers}
        isLoadingSwaps={isLoadingSwaps}
      />

      <DashboardStats 
        stats={stats} 
        isLoading={isLoading} 
      />

      {/* Debug panel is now visible during dev for troubleshooting */}
      <DashboardDebug isVisible={true} />

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
