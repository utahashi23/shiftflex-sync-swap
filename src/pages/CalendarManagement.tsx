
import React, { useState } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftCalendar from '@/components/ShiftCalendar';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { Shift } from '@/hooks/useShiftData';
import ShiftForm from '@/components/ShiftForm';
import { Card } from '@/components/ui/card';

const CalendarManagement = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Roster</h1>
        <p className="text-gray-500 mt-1">
          View and manage your rostered shifts
          {isAdmin && <span className="ml-2 text-blue-500">(Admin Access)</span>}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <ShiftCalendar
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedShift={selectedShift}
              setSelectedShift={setSelectedShift}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
            />
          </Card>
        </div>
        <div>
          <Card className="p-4">
            <ShiftForm 
              selectedDate={selectedDate}
              selectedShift={selectedShift}
              onCancel={() => {
                setSelectedShift(null);
                setSelectedDate(null);
              }}
              onSuccess={() => {
                toast({
                  title: selectedShift ? "Shift Updated" : "Shift Created",
                  description: `Successfully ${selectedShift ? 'updated' : 'created'} the shift.`,
                });
                setSelectedShift(null);
              }}
            />
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default CalendarManagement;
