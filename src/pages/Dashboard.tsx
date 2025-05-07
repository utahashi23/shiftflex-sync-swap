
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useEffect, useState } from 'react';
import { checkSupabaseConnection } from '@/integrations/supabase/client';

// Import refactored components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardDebug from '@/components/dashboard/DashboardDebug';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Database, Wifi, WifiOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  // Use isAuthenticated from useAuthRedirect
  const { isAuthenticated, protectedRoute } = useAuthRedirect({ protectedRoute: true });
  const { user, authChecked } = useAuth();
  const { stats, isLoading: isLoadingDashboard, connectionError: dashboardError } = useDashboardData(user);
  const { 
    totalUsers, 
    isLoadingUsers, 
    totalActiveSwaps, 
    isLoadingSwaps,
    connectionError: summaryError 
  } = useDashboardSummary();

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check database connection
  const checkConnection = async () => {
    try {
      console.log('Testing database connection...');
      setConnectionStatus('checking');
      
      const result = await checkSupabaseConnection();
      
      if (!result.connected) {
        console.error('Database connection test failed:', result.error);
        setConnectionStatus('error');
        setDatabaseError(result.error || 'Unknown connection error');
        toast({
          title: "Database Connection Error",
          description: result.error || "Unable to connect to the database. Please check your connection.",
          variant: "destructive"
        });
      } else {
        console.log('Database connection successful', result);
        setConnectionStatus('connected');
        setDatabaseError(null);
        toast({
          title: "Database Connected",
          description: "Successfully connected to the database.",
          variant: "default"
        });
      }
      
      setLastChecked(new Date());
    } catch (err: any) {
      console.error('Database connection test error:', err);
      setConnectionStatus('error');
      setDatabaseError(err.message || "Unknown connection error");
    }
  };
  
  // Initial connection check
  useEffect(() => {
    if (user) {
      checkConnection();
    }
  }, [user]);

  // Monitor for connection errors from our hooks
  useEffect(() => {
    if (summaryError || dashboardError) {
      setConnectionStatus('error');
      setDatabaseError(summaryError || dashboardError || "Connection error detected");
    }
  }, [summaryError, dashboardError]);

  // Enhanced debug logging for data loading status
  useEffect(() => {
    if (authChecked) {
      console.log('Auth checked, user:', user ? 'logged in' : 'not logged in');
      console.log('Connection status:', connectionStatus);
      if (databaseError) {
        console.error('Database error:', databaseError);
      }
    }
    
    if (!isLoadingDashboard) {
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
  }, [
    authChecked, user, connectionStatus, databaseError,
    isLoadingDashboard, stats, isLoadingUsers, isLoadingSwaps, 
    totalUsers, totalActiveSwaps
  ]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleRetryConnection = () => {
    checkConnection();
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
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg flex justify-between items-center">
          <div className="text-red-800">
            <div className="flex items-center gap-2 mb-1">
              <WifiOff className="h-5 w-5 text-red-600" />
              <strong>Database Connection Error</strong>
            </div>
            <p className="text-sm">{databaseError || "Unable to connect to the database. This will prevent data from loading properly."}</p>
            <p className="text-xs mt-1 text-red-600">
              Try refreshing the page or check your internet connection.
              {lastChecked && ` Last checked: ${lastChecked.toLocaleTimeString()}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRetryConnection} variant="outline" size="sm" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Test Connection
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      )}

      {connectionStatus === 'checking' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg flex justify-between items-center">
          <div className="text-yellow-800">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-yellow-600 animate-pulse" />
              <strong>Checking Database Connection...</strong>
            </div>
            <p className="text-sm">Verifying connection to the database.</p>
          </div>
        </div>
      )}

      {connectionStatus === 'connected' && !databaseError && (
        <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg flex justify-between items-center">
          <div className="text-green-800">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-green-600" />
              <strong>Database Connected</strong>
            </div>
            <p className="text-sm">Your database is connected and working properly.</p>
            {lastChecked && <p className="text-xs mt-1">Last checked: {lastChecked.toLocaleTimeString()}</p>}
          </div>
          <Button onClick={handleRetryConnection} variant="outline" size="sm" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Check Again
          </Button>
        </div>
      )}

      <DashboardStats 
        stats={stats} 
        isLoading={isLoadingDashboard} 
      />

      {/* Debug panel is now visible during dev for troubleshooting */}
      <DashboardDebug isVisible={true} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UpcomingShifts 
          shifts={stats.upcomingShifts} 
          isLoading={isLoadingDashboard} 
        />
        
        <RecentActivity 
          activities={stats.recentActivity} 
          isLoading={isLoadingDashboard} 
        />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
