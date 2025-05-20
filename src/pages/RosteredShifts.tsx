
import { useState, useRef, useEffect } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftCalendar from '@/components/ShiftCalendar';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { Shift } from '@/hooks/useShiftData';
import ShiftForm from '@/components/ShiftForm';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const RosteredShifts = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Effect to focus truck input when dialog opens
  useEffect(() => {
    if (isDialogOpen && !selectedShift) {
      // Add a small delay to ensure the input is rendered
      const timeoutId = setTimeout(() => {
        const truckInput = document.getElementById('truck-name-search');
        if (truckInput) {
          truckInput.focus();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isDialogOpen, selectedShift]);
  
  const handleDateClick = (date: Date, shift: Shift | null) => {
    console.log("handleDateClick called with date:", date, "and shift:", shift);
    setSelectedDate(date);
    setSelectedShift(shift);
    setIsDialogOpen(true);
  };
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Rostered Shifts</h1>
        <p className="text-gray-500 mt-1">
          View and manage your rostered shifts for the entire calendar
        </p>
      </div>
      
      <Card className="overflow-hidden w-full">
        <ShiftCalendar
          selectedDate={selectedDate}
          setSelectedDate={(date) => handleDateClick(date as Date, null)}
          selectedShift={selectedShift}
          setSelectedShift={(shift) => {
            if (shift) {
              console.log("Setting selectedShift in RosteredShifts:", shift);
              setSelectedShift(shift);
              setSelectedDate(new Date(shift.date));
              setIsDialogOpen(true);
            }
          }}
        />
      </Card>

      {/* Dialog for shift form with scrollable content */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh]">
          <DialogTitle>
            {selectedShift ? 'Edit Shift' : 'Add Shift to Calendar'}
          </DialogTitle>
          <ScrollArea className="h-full max-h-[70vh]">
            <ShiftForm 
              selectedDate={selectedDate}
              selectedShift={selectedShift}
              onCancel={() => {
                setIsDialogOpen(false);
                setSelectedShift(null);
                setSelectedDate(null);
              }}
              onSuccess={() => {
                toast({
                  title: selectedShift ? "Shift Updated" : "Shift Created",
                  description: `Successfully ${selectedShift ? 'updated' : 'created'} the shift.`,
                });
                setIsDialogOpen(false);
                setSelectedShift(null);
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default RosteredShifts;
