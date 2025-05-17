
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/hooks/useAuth';
import { useShiftData } from '@/hooks/useShiftData';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Shifts = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { shifts, isLoading } = useShiftData(currentDate, user?.id);
  
  useEffect(() => {
    document.title = 'My Shifts';
  }, []);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Shifts</h1>
        <p className="text-gray-500 mt-1">
          View and manage your scheduled shifts
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : shifts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <Card key={shift.id} className="overflow-hidden">
              <div className={`h-2 w-full ${shift.type === 'day' ? 'bg-blue-500' : shift.type === 'afternoon' ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{shift.title}</h3>
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100">{shift.colleagueType}</span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(shift.date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {`${shift.startTime} - ${shift.endTime}`}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            No shifts found for the current period
          </p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your administrator
          </p>
        </div>
      )}
    </AppLayout>
  );
};

export default Shifts;
