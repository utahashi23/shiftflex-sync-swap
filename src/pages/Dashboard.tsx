
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Clock, Repeat, Check, Calendar, CalendarClock } from 'lucide-react';

// Mock shift data
const mockShiftData = {
  totalShifts: 22,
  activeSwaps: 3,
  matchedSwaps: 1,
  completedSwaps: 5,
  upcomingShifts: [
    { id: 1, date: '2025-05-02', title: '02-MAT01', startTime: '07:00', endTime: '15:00', type: 'day' },
    { id: 2, date: '2025-05-03', title: '04-MAT03', startTime: '15:00', endTime: '23:00', type: 'afternoon' },
    { id: 3, date: '2025-05-05', title: '09-MAT12', startTime: '23:00', endTime: '07:00', type: 'night' },
    { id: 4, date: '2025-05-07', title: '06-MAT07', startTime: '07:00', endTime: '15:00', type: 'day' },
  ],
  recentActivity: [
    { id: 1, date: '2025-04-28', action: 'Created swap request', shift: '02-MAT01', status: 'Pending' },
    { id: 2, date: '2025-04-27', action: 'Accepted swap', shift: '04-MAT03', status: 'Matched' },
    { id: 3, date: '2025-04-25', action: 'Swap completed', shift: '10-MAT15', status: 'Completed' },
  ]
};

const Dashboard = () => {
  useAuthRedirect({ protectedRoute: true });
  
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(mockShiftData);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
                {/* Filtered content would go here */}
                <div className="py-8 text-center text-gray-500">
                  No pending activities to display
                </div>
              </TabsContent>
              <TabsContent value="matched">
                {/* Filtered content would go here */}
                <div className="py-8 text-center text-gray-500">
                  No matched activities to display
                </div>
              </TabsContent>
              <TabsContent value="completed">
                {/* Filtered content would go here */}
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
