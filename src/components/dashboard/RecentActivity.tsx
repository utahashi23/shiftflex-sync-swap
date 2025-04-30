
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Repeat } from 'lucide-react';

interface Activity {
  id: string;
  date: string;
  action: string;
  shift: string;
  status: string;
}

interface RecentActivityProps {
  activities: Activity[];
  isLoading: boolean;
}

const RecentActivity = ({ activities, isLoading }: RecentActivityProps) => {
  // Format date to display day of week and date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
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
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Repeat className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activity to display</p>
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {activities.map(activity => (
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
  );
};

export default RecentActivity;
