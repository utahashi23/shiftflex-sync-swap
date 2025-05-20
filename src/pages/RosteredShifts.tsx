
import { useState, useRef, useEffect } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ShiftCalendar from '@/components/ShiftCalendar';
import ShiftCardView from '@/components/ShiftCardView';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { Shift, useShiftData } from '@/hooks/useShiftData';
import ShiftForm from '@/components/ShiftForm';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarIcon, LayoutGrid } from 'lucide-react';

// Define view types
type ViewType = 'calendar' | 'card';

const RosteredShifts = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for view toggle
  const [viewType, setViewType] = useState<ViewType>('calendar');
  
  // States for shift selection and dialog
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get shift data for both calendar and card views
  const { shifts, isLoading } = useShiftData(currentDate, user?.id);
  
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

  const handleSelectShift = (shift: Shift) => {
    console.log("Setting selectedShift in RosteredShifts:", shift);
    setSelectedShift(shift);
    setSelectedDate(new Date(shift.date));
    setIsDialogOpen(true);
  };
  
  return (
    <AppLayout>
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Rostered Shifts</h1>
          <p className="text-gray-500 mt-1">
            View and manage your rostered shifts
          </p>
        </div>
        
        <ToggleGroup type="single" value={viewType} onValueChange={(value) => value && setViewType(value as ViewType)}>
          <ToggleGroupItem value="calendar" aria-label="Calendar view">
            <CalendarIcon className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Calendar</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutGrid className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only sm:ml-2">List</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      {viewType === 'calendar' ? (
        <Card className="overflow-hidden w-full">
          <ShiftCalendar
            selectedDate={selectedDate}
            setSelectedDate={(date) => handleDateClick(date as Date, null)}
            selectedShift={selectedShift}
            setSelectedShift={(shift) => {
              if (shift) {
                handleSelectShift(shift);
              }
            }}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden w-full p-4">
          <ShiftCardView 
            shifts={shifts}
            isLoading={isLoading}
            onSelectShift={handleSelectShift}
          />
        </Card>
      )}

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
