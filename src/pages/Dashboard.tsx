
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useEffect, useState } from 'react';

// Import refactored components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardDebug from '@/components/dashboard/DashboardDebug';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  // Use isAuthenticated from useAuthRedirect
  const { isAuthenticated, protectedRoute } = useAuthRedirect({ protectedRoute: true });
  const { user, authChecked } = useAuth();
  const { stats, isLoading } = useDashboardData(user);
  const { 
    totalUsers, 
    isLoadingUsers, 
    totalActiveSwaps, 
    isLoadingSwaps 
  } = useDashboardSummary();

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Check database connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('Testing database connection...');
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
          console.error('Database connection test failed:', error);
          setConnectionStatus('error');
          toast({
            title: "Database Connection Error",
            description: "Unable to connect to the database. Please check your connection.",
            variant: "destructive"
          });
        } else {
          console.log('Database connection successful');
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('Database connection test error:', err);
        setConnectionStatus('error');
      }
    };
    
    if (user) {
      checkConnection();
    }
  }, [user]);

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

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <AppLayout>
      <DashboardHeader 
        totalUsers={totalUsers}
        totalActiveSwaps={totalActiveSwaps}
        isLoadingUsers={isLoadingUsers}
        isLoadingSwaps={isLoadingSwaps}
      />

      {connectionStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg flex justify-between items-center">
          <div className="text-red-800">
            <strong>Database Connection Error</strong>
            <p className="text-sm">Unable to connect to the database. This may prevent data from loading properly.</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

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
