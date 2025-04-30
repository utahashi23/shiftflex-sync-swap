import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Clock, Repeat, Check, Calendar, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Type definitions for the data
interface Shift {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
}

interface Activity {
  id: string;
  date: string;
  action: string;
  shift: string;
  status: string;
}

interface DashboardStats {
  totalShifts: number;
  activeSwaps: number;
  matchedSwaps: number;
  completedSwaps: number;
  upcomingShifts: Shift[];
  recentActivity: Activity[];
}

const Dashboard = () => {
  useAuthRedirect({ protectedRoute: true });
  
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalShifts: 0,
    activeSwaps: 0,
    matchedSwaps: 0,
    completedSwaps: 0,
    upcomingShifts: [],
    recentActivity: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch the user's shifts
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', user?.id)
          .order('date', { ascending: true });
          
        if (shiftsError) throw shiftsError;
        
        // Fetch swap requests where the user is the requester
        const { data: swapRequests, error: swapRequestsError } = await supabase
          .from('shift_swap_requests')
          .select('*')
          .eq('requester_id', user?.id);
          
        if (swapRequestsError) throw swapRequestsError;
        
        // Fetch swap requests where the user is the acceptor
        const { data: swapAccepts, error: swapAcceptsError } = await supabase
          .from('shift_swap_requests')
          .select('*')
          .eq('acceptor_id', user?.id);
          
        if (swapAcceptsError) throw swapAcceptsError;
        
        // Format the shifts for display
        const upcomingShifts = shiftsData?.map(shift => {
          // Create a title from the truck name or use a default
          const title = shift.truck_name ? shift.truck_name : `Shift-${shift.id.substring(0, 5)}`;
          
          // Determine the shift type based on start time
          let type: 'day' | 'afternoon' | 'night' = 'day';
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour >= 5 && startHour < 13) {
            type = 'day';
          } else if (startHour >= 13 && startHour < 21) {
            type = 'afternoon';
          } else {
            type = 'night';
          }
          
          return {
            id: shift.id,
            date: shift.date,
            title,
            startTime: shift.start_time.substring(0, 5), // Format as HH:MM
            endTime: shift.end_time.substring(0, 5),     // Format as HH:MM
            type
          };
        }) || [];
        
        // Count the different types of swap requests
        const activeSwaps = swapRequests?.filter(req => req.status === 'pending').length || 0;
        const matchedSwaps = swapRequests?.filter(req => req.status === 'matched').length || 0;
        const completedSwaps = swapRequests?.filter(req => req.status === 'completed').length || 0;
        
        // Combine all swap requests for activity feed
        const allSwaps = [...(swapRequests || []), ...(swapAccepts || [])];
        
        // Sort by created_at date (newest first)
        allSwaps.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Format the recent activity
        const recentActivity = allSwaps.slice(0, 5).map(swap => {
          let action = "";
          let status = swap.status;
          
          if (swap.requester_id === user?.id) {
            action = "Created swap request";
          } else {
            action = "Received swap request";
          }
          
          // Try to get the shift title from our shifts
          const shiftInfo = shiftsData?.find(s => s.id === swap.requester_shift_id);
          const shift = shiftInfo ? 
            (shiftInfo.truck_name || `Shift-${shiftInfo.id.substring(0, 5)}`) : 
            `Unknown Shift`;
          
          return {
            id: swap.id,
            date: new Date(swap.created_at).toISOString().split('T')[0],
            action,
            shift,
            status: status.charAt(0).toUpperCase() + status.slice(1) // Capitalize the first letter
          };
        });
        
        setStats({
          totalShifts: shiftsData?.length || 0,
          activeSwaps,
          matchedSwaps,
          completedSwaps,
          upcomingShifts: upcomingShifts.slice(0, 4), // Limit to 4 upcoming shifts
          recentActivity
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error loading dashboard",
          description: "Could not load your dashboard data. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Get shift color class based on shift type
  const getShiftTypeClass = (type: string) => {
    switch (type) {
      case 'day':
        return 'bg-yellow-100 text-yellow-800';
      case 'afternoon':
        return 'bg-orange-100 text-orange-800';
      case 'night':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format date to display day of week and date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {user?.user_metadata?.first_name || 'User'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rostered Shifts</p>
                <h3 className="text-2xl font-bold">{isLoading ? '...' : stats.totalShifts}</h3>
                <p className="text-xs text-muted-foreground mt-1">For the current month</p>
              </div>
              <div className="p-2 bg-secondary/50 rounded-full">
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Swap Requests</p>
                <h3 className="text-2xl font-bold">{isLoading ? '...' : stats.activeSwaps}</h3>
                <p className="text-xs text-muted-foreground mt-1">Pending approval or match</p>
              </div>
              <div className="p-2 bg-secondary/50 rounded-full">
                <Repeat className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Matched Swaps</p>
                <h3 className="text-2xl font-bold">{isLoading ? '...' : stats.matchedSwaps}</h3>
                <p className="text-xs text-muted-foreground mt-1">Ready for approval</p>
              </div>
              <div className="p-2 bg-secondary/50 rounded-full">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Swaps</p>
                <h3 className="text-2xl font-bold">{isLoading ? '...' : stats.completedSwaps}</h3>
                <p className="text-xs text-muted-foreground mt-1">Successfully exchanged</p>
              </div>
              <div className="p-2 bg-secondary/50 rounded-full">
                <Check className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-16 bg-gray-100 animate-pulse rounded-md" />
                ))}
              </div>
            ) : stats.upcomingShifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No upcoming shifts scheduled</p>
                <Button variant="outline" className="mt-4">
                  View Calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.upcomingShifts.map(shift => (
                  <div key={shift.id} className="flex items-center p-3 border rounded-md bg-gray-50">
                    <div className="w-14 h-14 flex flex-col items-center justify-center rounded bg-white border">
                      <span className="text-xs font-bold text-gray-500">
                        {new Date(shift.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold">
                        {new Date(shift.date).getDate()}
                      </span>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <div className="font-medium">{shift.title}</div>
                      <div className="text-sm text-gray-500">{shift.startTime} - {shift.endTime}</div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-xs ${getShiftTypeClass(shift.type)}`}>
                      {shift.type.charAt(0).toUpperCase() + shift.type.slice(1)} Shift
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-2">
                  View All Shifts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="matched">Matched</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {isLoading ? (
                  <div className="space-y-3 mt-3">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="h-16 bg-gray-100 animate-pulse rounded-md" />
                    ))}
                  </div>
                ) : stats.recentActivity.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Repeat className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No recent activity to display</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-3">
                    {stats.recentActivity.map(activity => (
                      <div key={activity.id} className="p-3 border rounded-md bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{activity.action}</div>
                          <div className="text-xs text-gray-500">{formatDate(activity.date)}</div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm">{activity.shift}</div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            activity.status === 'Pending' ? 'bg-red-100 text-red-800' : 
                            activity.status === 'Matched' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {activity.status}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button variant="outline" className="w-full mt-2">
                      View All Activity
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="pending">
                <div className="py-8 text-center text-gray-500">
                  No pending activities to display
                </div>
              </TabsContent>
              <TabsContent value="matched">
                <div className="py-8 text-center text-gray-500">
                  No matched activities to display
                </div>
              </TabsContent>
              <TabsContent value="completed">
                <div className="py-8 text-center text-gray-500">
                  No completed activities to display
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
