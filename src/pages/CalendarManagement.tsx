
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftCalendar from '@/components/ShiftCalendar';
import ShiftForm from '@/components/ShiftForm';

const CalendarManagement = () => {
  useAuthRedirect({ protectedRoute: true });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<any | null>(null);
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Calendar Management</h1>
        <p className="text-gray-500 mt-1">
          Add, edit, and manage your shifts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-0">
            <ShiftCalendar 
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedShift={selectedShift}
              setSelectedShift={setSelectedShift}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <ShiftForm 
              selectedDate={selectedDate} 
              selectedShift={selectedShift}
              setSelectedShift={setSelectedShift}
              resetSelection={() => {
                setSelectedShift(null);
                setSelectedDate(null);
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CalendarManagement;
