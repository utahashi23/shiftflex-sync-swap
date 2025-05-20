
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useShiftData, getShiftForDate, Shift } from '@/hooks/useShiftData';
import { getDaysInMonth, getFirstDayOfMonth, formatDateString } from '@/utils/dateUtils';
import { CalendarDayCell, CalendarSkeletonCell } from './calendar/CalendarDayCell';
import { WeekdayHeader } from './calendar/CalendarHeader';
import { CalendarLegend } from './calendar/CalendarLegend';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Repeat } from 'lucide-react';

interface ShiftCalendarProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift | null) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onAddNewShift?: () => void;
  onOpenRepeatDialog?: () => void;
}

// Form schema for repeat options
const formSchema = z.object({
  repeatPattern: z.enum(['4-4', 'weekly', 'fortnightly', 'monthly']),
  endDate: z.date({ required_error: "End date is required" }),
});

type RepeatFormValues = z.infer<typeof formSchema>;

const ShiftCalendar = ({ 
  selectedDate, 
  setSelectedDate, 
  selectedShift, 
  setSelectedShift,
  currentDate,
  setCurrentDate,
  onAddNewShift,
  onOpenRepeatDialog
}: ShiftCalendarProps) => {
  const { user } = useAuth();
  const { shifts, isLoading, refetchShifts } = useShiftData(currentDate, user?.id);
  const [isRepeatDialogOpen, setIsRepeatDialogOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Form for repeat options
  const form = useForm<RepeatFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repeatPattern: 'weekly',
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)), // Default to 2 months from now
    },
  });

  const handleDateClick = (date: Date, shift: Shift | null) => {
    if (isSelectMode && shift) {
      // In select mode, toggle the shift selection
      const isAlreadySelected = selectedShifts.some(s => s.id === shift.id);
      if (isAlreadySelected) {
        setSelectedShifts(selectedShifts.filter(s => s.id !== shift.id));
      } else {
        setSelectedShifts([...selectedShifts, shift]);
      }
    } else {
      // Normal mode - set the selected shift/date
      console.log("ShiftCalendar handleDateClick called with shift:", shift);
      // First set the shift (if it exists)
      if (shift) {
        console.log("Found shift, setting in ShiftCalendar:", shift);
        setSelectedShift(shift);
      } else {
        setSelectedShift(null);
      }
      setSelectedDate(date);
    }
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const handleSubmitRepeat = async (values: RepeatFormValues) => {
    if (!user?.id || selectedShifts.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      let successCount = 0;
      
      switch(values.repeatPattern) {
        case '4-4': {
          // 4 days on, 4 days off pattern
          const patternShifts = [...selectedShifts];
          const startDate = new Date(Math.min(...patternShifts.map(s => new Date(s.date).getTime())));
          const endDate = values.endDate;
          
          let currentDate = new Date(startDate);
          // Add 8 days (4 on + 4 off) to get to next cycle start
          currentDate.setDate(currentDate.getDate() + 8);
          
          // Keep repeating until we reach the end date
          while (currentDate <= endDate) {
            for (const shift of patternShifts) {
              const shiftDate = new Date(shift.date);
              const dayOffset = (shiftDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
              
              const newShiftDate = new Date(currentDate);
              newShiftDate.setDate(currentDate.getDate() + dayOffset);
              
              if (newShiftDate <= endDate) {
                const formattedDate = format(newShiftDate, 'yyyy-MM-dd');
                
                // Check if there's already a shift on this date to avoid duplicates
                const { data: existingShifts } = await supabase
                  .from('shifts')
                  .select('id')
                  .eq('date', formattedDate)
                  .eq('user_id', user.id);
                  
                if (existingShifts && existingShifts.length > 0) {
                  console.log(`Skip creating shift for ${formattedDate} - already exists`);
                  continue;
                }
                
                // Clone the shift with the new date
                const { error } = await supabase
                  .from('shifts')
                  .insert([{
                    user_id: user.id,
                    date: formattedDate,
                    truck_name: shift.title,
                    start_time: shift.startTime,
                    end_time: shift.endTime,
                    colleague_type: shift.colleagueType
                  }]);
                  
                if (!error) {
                  successCount++;
                }
              }
            }
            
            // Move to next cycle
            currentDate.setDate(currentDate.getDate() + 8);
          }
          break;
        }
        case 'weekly': {
          // Weekly pattern - repeat every 7 days
          await repeatShifts(selectedShifts, values.endDate, 7, user.id);
          break;
        }
        case 'fortnightly': {
          // Fortnightly pattern - repeat every 14 days
          await repeatShifts(selectedShifts, values.endDate, 14, user.id);
          break;
        }
        case 'monthly': {
          // Monthly pattern - repeat on same day of each month
          for (const shift of selectedShifts) {
            const shiftDate = new Date(shift.date);
            const currentMonth = shiftDate.getMonth();
            let targetMonth = currentMonth + 1;
            let targetYear = shiftDate.getFullYear();
            
            while (true) {
              if (targetMonth > 11) {
                targetMonth = 0;
                targetYear++;
              }
              
              const newShiftDate = new Date(targetYear, targetMonth, shiftDate.getDate());
              
              // Break if we've passed the end date
              if (newShiftDate > values.endDate) break;
              
              // Check if the date is valid (handle cases like Feb 30)
              if (newShiftDate.getMonth() === targetMonth) {
                const formattedDate = format(newShiftDate, 'yyyy-MM-dd');
                
                // Check for existing shifts
                const { data: existingShifts } = await supabase
                  .from('shifts')
                  .select('id')
                  .eq('date', formattedDate)
                  .eq('user_id', user.id);
                  
                if (existingShifts && existingShifts.length > 0) {
                  console.log(`Skip creating shift for ${formattedDate} - already exists`);
                  continue;
                }
                
                // Create the new shift
                const { error } = await supabase
                  .from('shifts')
                  .insert([{
                    user_id: user.id,
                    date: formattedDate,
                    truck_name: shift.title,
                    start_time: shift.startTime,
                    end_time: shift.endTime,
                    colleague_type: shift.colleagueType
                  }]);
                
                if (!error) {
                  successCount++;
                }
              }
              
              targetMonth++;
            }
          }
          break;
        }
      }
      
      toast({
        title: "Shifts repeated",
        description: `Created ${successCount} new shifts based on your selection.`
      });
      
      // Reset state and close dialog
      setSelectedShifts([]);
      setIsSelectMode(false);
      setIsRepeatDialogOpen(false);
      form.reset();
      
      // Refetch shifts to update the calendar
      refetchShifts();
      
    } catch (error) {
      console.error('Error repeating shifts:', error);
      toast({
        title: "Error",
        description: "Failed to repeat shifts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to repeat shifts with a given interval
  const repeatShifts = async (shiftsToRepeat: Shift[], endDate: Date, dayInterval: number, userId: string) => {
    let successCount = 0;

    for (const shift of shiftsToRepeat) {
      let shiftDate = new Date(shift.date);
      
      // Start from the next interval
      shiftDate.setDate(shiftDate.getDate() + dayInterval);
      
      // Keep creating new shifts until we reach the end date
      while (shiftDate <= endDate) {
        const formattedDate = format(shiftDate, 'yyyy-MM-dd');
        
        // Check for existing shifts
        const { data: existingShifts } = await supabase
          .from('shifts')
          .select('id')
          .eq('date', formattedDate)
          .eq('user_id', userId);
          
        if (existingShifts && existingShifts.length > 0) {
          console.log(`Skip creating shift for ${formattedDate} - already exists`);
          shiftDate.setDate(shiftDate.getDate() + dayInterval);
          continue;
        }
        
        // Create the new shift
        const { error } = await supabase
          .from('shifts')
          .insert([{
            user_id: userId,
            date: formattedDate,
            truck_name: shift.title,
            start_time: shift.startTime,
            end_time: shift.endTime,
            colleague_type: shift.colleagueType
          }]);

        if (!error) {
          successCount++;
        }
        
        // Move to the next interval
        shiftDate.setDate(shiftDate.getDate() + dayInterval);
      }
    }

    return successCount;
  };

  const handleRepeatSuccess = (count: number) => {
    // Reset selection state after successful repeat
    setIsSelectMode(false);
    setSelectedShifts([]);
    refetchShifts();
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const daysArray = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(<CalendarDayCell key={`empty-${i}`} day={0} dateStr="" isSelected={false} onClick={() => {}} empty={true} />);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= days; day++) {
      // Create the date in the local timezone
      const dateStr = formatDateString(year, month, day);
      const dateObj = new Date(year, month, day);
      
      const shift = getShiftForDate(shifts, dateStr);
      
      // Determine if this cell is selected
      const isSelected = isSelectMode 
        ? shift && selectedShifts.some(s => s.id === shift.id)
        : (selectedShift?.date === dateStr || 
          (selectedDate && dateObj.toDateString() === selectedDate.toDateString() && !selectedShift));
        
      daysArray.push(
        <CalendarDayCell 
          key={day}
          day={day}
          dateStr={dateStr}
          shift={shift}
          isSelected={isSelected}
          isSelectMode={isSelectMode}
          onClick={() => handleDateClick(dateObj, shift || null)}
        />
      );
    }
    
    return daysArray;
  };

  return (
    <div className="flex flex-col p-4">
      {/* Month navigation that matches the card view style */}
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="font-medium text-lg">{format(currentDate, 'MMMM yyyy')}</h2>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => changeMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <WeekdayHeader />
      
      <div className="grid grid-cols-7 gap-1 min-h-[500px]">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 35 }).map((_, i) => (
            <CalendarSkeletonCell key={i} />
          ))
        ) : (
          // Actual calendar
          renderCalendar()
        )}
      </div>
      
      <CalendarLegend />
      
      {/* Repeat Options Dialog - shows repeat pattern options directly */}
      <Dialog open={isRepeatDialogOpen} onOpenChange={setIsRepeatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Repeat {selectedShifts.length} Selected Shifts</DialogTitle>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitRepeat)} className="space-y-4">
              <FormField
                control={form.control}
                name="repeatPattern"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <Label>Repeat Pattern</Label>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="4-4" id="r1" />
                          <Label htmlFor="r1">4/4 (4 days on, 4 days off)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="r2" />
                          <Label htmlFor="r2">Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fortnightly" id="r3" />
                          <Label htmlFor="r3">Fortnightly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monthly" id="r4" />
                          <Label htmlFor="r4">Monthly</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Label>Repeat Until</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <Repeat className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-700">
                      This will create new shifts for the selected pattern until the end date.
                      Any existing shifts on those dates will be skipped.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsRepeatDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting || selectedShifts.length === 0}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Repeated Shifts'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftCalendar;
