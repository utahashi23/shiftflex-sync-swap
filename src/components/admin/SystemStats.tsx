
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, LineChart, PieChart } from '@/components/ui/chart';
import { Users, Calendar, ArrowLeftRight, Clock } from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  totalShifts: number;
  totalSwapRequests: number;
  totalSwapMatches: number;
  recentActivity: Array<{date: string, count: number}>;
  swapsByStatus: Array<{status: string, count: number}>;
  shiftsPerDay: Array<{date: string, count: number}>;
}

export const SystemStats = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalShifts: 0,
    totalSwapRequests: 0,
    totalSwapMatches: 0,
    recentActivity: [],
    swapsByStatus: [],
    shiftsPerDay: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user count
      const { data: userCount, error: userError } = await supabase.rpc('admin_get_user_count');
      
      if (userError) throw userError;
      
      // Fetch shift count
      const { data: shiftCount, error: shiftError } = await supabase
        .from('shifts')
        .select('id', { count: 'exact', head: true });
      
      if (shiftError) throw shiftError;
      
      // Fetch swap request count
      const { data: requestCount, error: requestError } = await supabase
        .from('shift_swap_requests')
        .select('id', { count: 'exact', head: true });
      
      if (requestError) throw requestError;
      
      // Fetch swap match count
      const { data: matchCount, error: matchError } = await supabase
        .from('shift_swap_potential_matches')
        .select('id', { count: 'exact', head: true });
      
      if (matchError) throw matchError;
      
      // Fetch recent activity (last 7 days of swap requests)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentActivity, error: activityError } = await supabase
        .rpc('admin_get_recent_activity');
      
      if (activityError) throw activityError;
      
      // Fetch swaps by status
      const { data: swapsByStatus, error: statusError } = await supabase
        .rpc('admin_get_swaps_by_status');
      
      if (statusError) throw statusError;
      
      // Fetch shifts per day for the last 14 days
      const { data: shiftsPerDay, error: shiftsPerDayError } = await supabase
        .rpc('admin_get_shifts_per_day');
      
      if (shiftsPerDayError) throw shiftsPerDayError;
      
      setStats({
        totalUsers: userCount || 0,
        totalShifts: shiftCount?.length || 0,
        totalSwapRequests: requestCount?.length || 0,
        totalSwapMatches: matchCount?.length || 0,
        recentActivity: recentActivity || [],
        swapsByStatus: swapsByStatus || [],
        shiftsPerDay: shiftsPerDay || []
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system statistics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">System Statistics</h2>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <p>Loading statistics...</p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-gray-500">Registered accounts</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalShifts}</div>
                <p className="text-xs text-gray-500">Scheduled shifts</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Swap Requests</CardTitle>
                <ArrowLeftRight className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSwapRequests}</div>
                <p className="text-xs text-gray-500">Shift swap requests</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Swap Matches</CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSwapMatches}</div>
                <p className="text-xs text-gray-500">Potential matches found</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Swap requests over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart 
                  data={stats.recentActivity}
                  categories={['count']}
                  index="date"
                  valueFormatter={(value) => `${value} requests`}
                  className="aspect-[4/3]"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Swap Requests by Status</CardTitle>
                <CardDescription>Distribution of swap request statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart 
                  data={stats.swapsByStatus.map(item => ({
                    name: item.status,
                    value: item.count
                  }))}
                  valueFormatter={(value) => `${value} requests`}
                  className="aspect-[4/3]"
                />
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Shifts per Day</CardTitle>
                <CardDescription>Number of shifts per day for the last 14 days</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart 
                  data={stats.shiftsPerDay}
                  categories={['count']}
                  index="date"
                  valueFormatter={(value) => `${value} shifts`}
                  className="aspect-[16/9]"
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
