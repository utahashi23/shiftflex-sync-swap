
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CalendarIcon, LayoutGrid, PlusCircle, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import RepeatShiftsDialog from '@/components/RepeatShiftsDialog';
import RepeatShiftsCalendarDialog from '@/components/RepeatShiftsCalendarDialog';

// Define view types
type ViewType = 'calendar' | 'card';

const RosteredShifts = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for view toggle - initialize with card view, but we'll update it from preferences
  const [viewType, setViewType] = useState<ViewType>('card');
  
  // States for shift selection and dialog
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRepeatDialogOpen, setIsRepeatDialogOpen] = useState(false);
  const [isCalendarRepeatDialogOpen, setIsCalendarRepeatDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
  const [shiftsToDelete, setShiftsToDelete] = useState<string[]>([]);
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);
  
  // Get shift data for both calendar and card views
  const { shifts, isLoading, refetchShifts } = useShiftData(currentDate, user?.id);
  
  // Fetch user's preferred view from system preferences
  useEffect(() => {
    const fetchPreferredView = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('system_preferences')
          .select('roster_default_view')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error('Error fetching preferred view:', error);
          return;
        }
        
        if (data && data.roster_default_view) {
          // Set the view type based on user preferences
          setViewType(data.roster_default_view as ViewType);
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };
    
    fetchPreferredView();
  }, [user]);
  
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
  
  const handleChangeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };
  
  const handleFormSuccess = () => {
    toast({
      title: selectedShift ? "Shift Updated" : "Shift Created",
      description: `Successfully ${selectedShift ? 'updated' : 'created'} the shift.`,
    });
    setIsDialogOpen(false);
    setSelectedShift(null);
    // Refetch shifts to update both views
    refetchShifts();
  };

  const handleAddNewShift = () => {
    setSelectedDate(new Date());
    setSelectedShift(null);
    setIsDialogOpen(true);
  };

  const handleOpenRepeatDialog = () => {
    if (viewType === 'calendar') {
      setIsCalendarRepeatDialogOpen(true);
    } else {
      setIsRepeatDialogOpen(true);
    }
  };

  const handleRepeatSuccess = (count: number) => {
    toast({
      title: "Shifts Repeated",
      description: `Successfully created ${count} new repeated shifts.`,
    });
    refetchShifts();
  };
  
  // Handle delete shift
  const handleDeleteShift = (shiftId: string) => {
    setShiftToDelete(shiftId);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle delete multiple shifts
  const handleDeleteMultipleShifts = (shiftIds: string[]) => {
    setShiftsToDelete(shiftIds);
    setIsMultiDeleteDialogOpen(true);
  };
  
  // Confirm delete shift
  const confirmDeleteShift = async () => {
    if (!shiftToDelete) return;
    
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftToDelete);
        
      if (error) throw error;
      
      toast({
        title: "Shift Deleted",
        description: "The shift has been successfully deleted.",
      });
      
      refetchShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast({
        title: "Error",
        description: "Failed to delete the shift. Please try again.",
        variant: "destructive"
      });
    } finally {
      setShiftToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  // Confirm delete multiple shifts
  const confirmDeleteMultipleShifts = async () => {
    if (shiftsToDelete.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .in('id', shiftsToDelete);
        
      if (error) throw error;
      
      toast({
        title: "Shifts Deleted",
        description: `Successfully deleted ${shiftsToDelete.length} shifts.`,
      });
      
      refetchShifts();
    } catch (error) {
      console.error('Error deleting multiple shifts:', error);
      toast({
        title: "Error",
        description: "Failed to delete shifts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setShiftsToDelete([]);
      setIsMultiDeleteDialogOpen(false);
    }
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
        
        <div className="flex items-center gap-2">
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

          <Button 
            onClick={handleAddNewShift}
            aria-label="Add new shift"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <PlusCircle className="h-5 w-5 text-white" />
          </Button>

          <Button 
            onClick={handleOpenRepeatDialog}
            aria-label="Repeat shifts"
            variant="outline"
            className="border-blue-500 text-blue-500 hover:bg-blue-50"
          >
            <Repeat className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Repeat</span>
          </Button>
        </div>
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
            currentDate={currentDate}
            onChangeMonth={handleChangeMonth}
            onDeleteShift={handleDeleteShift}
            onDeleteMultipleShifts={handleDeleteMultipleShifts}
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
              onSuccess={handleFormSuccess}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Card View Repeat Shifts Dialog */}
      <RepeatShiftsDialog 
        open={isRepeatDialogOpen} 
        onOpenChange={setIsRepeatDialogOpen}
        shifts={shifts}
        userId={user?.id}
        onSuccess={handleRepeatSuccess}
      />

      {/* Calendar View Repeat Shifts Dialog */}
      <RepeatShiftsCalendarDialog
        open={isCalendarRepeatDialogOpen}
        onOpenChange={setIsCalendarRepeatDialogOpen}
        shifts={shifts}
        onSuccess={handleRepeatSuccess}
      />

      {/* Delete Single Shift Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shift? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShiftToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteShift}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Multiple Shifts Confirmation Dialog */}
      <AlertDialog open={isMultiDeleteDialogOpen} onOpenChange={setIsMultiDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Shifts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {shiftsToDelete.length} selected shifts? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShiftsToDelete([])}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMultipleShifts}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete {shiftsToDelete.length} Shifts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default RosteredShifts;
