
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
      const { data: userCountData, error: userError } = await supabase
        .from('auth.users')
        .select('id', { count: 'exact', head: true });
      
      const userCount = userCountData !== null ? userCountData.length : 0;
      
      if (userError) throw userError;
      
      // Fetch shift count
      const { count: shiftCount, error: shiftError } = await supabase
        .from('shifts')
        .select('id', { count: 'exact', head: true });
      
      if (shiftError) throw shiftError;
      
      // Fetch swap request count
      const { count: requestCount, error: requestError } = await supabase
        .from('shift_swap_requests')
        .select('id', { count: 'exact', head: true });
      
      if (requestError) throw requestError;
      
      // Fetch swap match count
      const { count: matchCount, error: matchError } = await supabase
        .from('shift_swap_potential_matches')
        .select('id', { count: 'exact', head: true });
      
      if (matchError) throw matchError;
      
      // Fetch recent activity (last 7 days of swap requests)
      const { data: recentActivity, error: activityError } = await supabase
        .from('shift_swap_requests')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (activityError) throw activityError;
      
      // Process recent activity into date counts
      const activityByDate = recentActivity?.reduce((acc: Record<string, number>, item) => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};
      
      // Generate last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();
      
      const formattedActivity = last7Days.map(date => ({
        date,
        count: activityByDate[date] || 0
      }));
      
      // Fetch swaps by status
      const { data: swapsData, error: swapsError } = await supabase
        .from('shift_swap_requests')
        .select('status');
      
      if (swapsError) throw swapsError;
      
      // Process swaps into status counts
      const swapsByStatus = swapsData?.reduce((acc: Record<string, number>, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}) || {};
      
      const formattedSwaps = Object.entries(swapsByStatus).map(([status, count]) => ({
        status,
        count: count as number
      }));
      
      // Fetch shifts per day for the last 14 days
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const { data: shiftsData, error: shiftsPerDayError } = await supabase
        .from('shifts')
        .select('date')
        .gte('date', twoWeeksAgo.toISOString().split('T')[0]);
      
      if (shiftsPerDayError) throw shiftsPerDayError;
      
      // Process shifts into date counts
      const shiftsByDate = shiftsData?.reduce((acc: Record<string, number>, item) => {
        const date = new Date(item.date).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};
      
      // Generate last 14 days
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();
      
      const formattedShifts = last14Days.map(date => ({
        date,
        count: shiftsByDate[date] || 0
      }));
      
      setStats({
        totalUsers: userCount || 0,
        totalShifts: shiftCount || 0,
        totalSwapRequests: requestCount || 0,
        totalSwapMatches: matchCount || 0,
        recentActivity: formattedActivity,
        swapsByStatus: formattedSwaps,
        shiftsPerDay: formattedShifts
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
