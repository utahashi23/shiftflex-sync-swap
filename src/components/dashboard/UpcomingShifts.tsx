
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Shift } from '@/hooks/useShiftData';

interface UpcomingShiftsProps {
  shifts: Shift[];
  isLoading: boolean;
}

const UpcomingShifts = ({ shifts, isLoading }: UpcomingShiftsProps) => {
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

  return (
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
        ) : shifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No upcoming shifts scheduled</p>
            <Button variant="outline" className="mt-4">
              View Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map(shift => (
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
  );
};

export default UpcomingShifts;
