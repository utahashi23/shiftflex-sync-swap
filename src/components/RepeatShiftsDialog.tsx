import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Shift } from '@/hooks/useShiftData';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface RepeatShiftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: Shift[];
  userId?: string;
  onSuccess: (count: number) => void;
}

type RepeatPattern = '4-4' | 'weekly' | 'fortnightly' | 'monthly';

const formSchema = z.object({
  selectedShifts: z.array(z.string()).min(1, { message: "Select at least one shift to repeat" }),
  repeatPattern: z.enum(['4-4', 'weekly', 'fortnightly', 'monthly']),
  endDate: z.date({ required_error: "End date is required" }),
});

type RepeatFormValues = z.infer<typeof formSchema>;

const RepeatShiftsDialog: React.FC<RepeatShiftsDialogProps> = ({ 
  open, 
  onOpenChange, 
  shifts,
  userId,
  onSuccess 
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  const form = useForm<RepeatFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedShifts: [],
      repeatPattern: '4-4',
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)), // Default to 2 months from now
    },
  });

  const handleSelectAll = () => {
    form.setValue('selectedShifts', shifts.map(shift => shift.id));
  };

  const handleClearSelection = () => {
    form.setValue('selectedShifts', []);
  };

  const handleNext = () => {
    const selectedShifts = form.getValues('selectedShifts');
    if (selectedShifts.length === 0) {
      form.setError('selectedShifts', { 
        type: 'manual', 
        message: 'Please select at least one shift to repeat' 
      });
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const resetDialog = () => {
    setStep(1);
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (values: RepeatFormValues) => {
    if (!userId) return;

    try {
      const selectedShiftsData = shifts.filter(shift => values.selectedShifts.includes(shift.id));
      const createdShifts: Shift[] = [];

      switch(values.repeatPattern) {
        case '4-4': {
          // 4 days on, 4 days off pattern
          const patternShifts = [...selectedShiftsData];
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
                
                // Prepare the new shift data to be inserted
                const { data: newShift, error } = await supabase
                  .from('shifts')
                  .insert({
                    user_id: userId,
                    date: formattedDate,
                    truck_name: shift.title,
                    start_time: shift.startTime,
                    end_time: shift.endTime,
                    colleague_type: shift.colleagueType
                  })
                  .select()
                  .single();

                if (!error && newShift) {
                  createdShifts.push({
                    id: newShift.id,
                    date: newShift.date,
                    title: newShift.truck_name,
                    startTime: newShift.start_time,
                    endTime: newShift.end_time,
                    type: shift.type,
                    colleagueType: newShift.colleague_type as any
                  });
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
          repeatShifts(selectedShiftsData, values.endDate, 7);
          break;
        }
        case 'fortnightly': {
          // Fortnightly pattern - repeat every 14 days
          repeatShifts(selectedShiftsData, values.endDate, 14);
          break;
        }
        case 'monthly': {
          // Monthly pattern - repeat on same day of each month
          const selectedShiftsData = shifts.filter(shift => values.selectedShifts.includes(shift.id));
          const endDate = values.endDate;
          
          for (const shift of selectedShiftsData) {
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
              if (newShiftDate > endDate) break;
              
              // Check if the date is valid (handle cases like Feb 30)
              if (newShiftDate.getMonth() === targetMonth) {
                const formattedDate = format(newShiftDate, 'yyyy-MM-dd');
                
                // Create the new shift
                const { data: newShift, error } = await supabase
                  .from('shifts')
                  .insert({
                    user_id: userId,
                    date: formattedDate,
                    truck_name: shift.title,
                    start_time: shift.startTime,
                    end_time: shift.endTime,
                    colleague_type: shift.colleagueType
                  })
                  .select()
                  .single();
  
                if (!error && newShift) {
                  createdShifts.push({
                    id: newShift.id,
                    date: newShift.date,
                    title: newShift.truck_name,
                    startTime: newShift.start_time,
                    endTime: newShift.end_time,
                    type: shift.type,
                    colleagueType: newShift.colleague_type as any
                  });
                }
              }
              
              targetMonth++;
            }
          }
          break;
        }
      }

      // Call the success callback with the number of shifts created
      onSuccess(createdShifts.length);
      resetDialog();
    } catch (error) {
      console.error("Error repeating shifts:", error);
    }
  };

  // Helper function to repeat shifts with a given interval
  const repeatShifts = async (shiftsToRepeat: Shift[], endDate: Date, dayInterval: number) => {
    const createdShifts: Shift[] = [];

    for (const shift of shiftsToRepeat) {
      let shiftDate = new Date(shift.date);
      
      // Start from the next interval
      shiftDate.setDate(shiftDate.getDate() + dayInterval);
      
      // Keep creating new shifts until we reach the end date
      while (shiftDate <= endDate) {
        const formattedDate = format(shiftDate, 'yyyy-MM-dd');
        
        // Create the new shift
        const { data: newShift, error } = await supabase
          .from('shifts')
          .insert({
            user_id: userId,
            date: formattedDate,
            truck_name: shift.title,
            start_time: shift.startTime,
            end_time: shift.endTime,
            colleague_type: shift.colleagueType
          })
          .select()
          .single();

        if (!error && newShift) {
          createdShifts.push({
            id: newShift.id,
            date: newShift.date,
            title: newShift.truck_name,
            startTime: newShift.start_time,
            endTime: newShift.end_time,
            type: shift.type,
            colleagueType: newShift.colleague_type as any
          });
        }
        
        // Move to the next interval
        shiftDate.setDate(shiftDate.getDate() + dayInterval);
      }
    }

    return createdShifts;
  };

  const selectedShiftIds = form.watch('selectedShifts');
  const repeatPattern = form.watch('repeatPattern');

  return (
    <Dialog open={open} onOpenChange={(newOpenState) => {
      if (!newOpenState) {
        resetDialog();
      } else {
        onOpenChange(newOpenState);
      }
    }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogTitle>Repeat Shifts</DialogTitle>
        <DialogDescription>
          {step === 1 ? 
            "Select the shifts you want to repeat and click Next." : 
            "Choose a repeat pattern and end date for your selected shifts."}
        </DialogDescription>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="flex justify-between mb-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    Select All
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearSelection}
                  >
                    Clear
                  </Button>
                </div>
                
                <div className="h-[50vh] overflow-y-auto">
                  <div className="space-y-2">
                    {shifts.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">No shifts found to repeat</p>
                    ) : (
                      shifts.map((shift) => {
                        const isSelected = selectedShiftIds.includes(shift.id);
                        return (
                          <Card 
                            key={shift.id} 
                            className={cn(
                              "p-3 cursor-pointer transition-colors",
                              isSelected ? "border-blue-500 bg-blue-50" : ""
                            )}
                            onClick={() => {
                              const currentSelected = [...form.getValues('selectedShifts')];
                              const index = currentSelected.indexOf(shift.id);
                              if (index === -1) {
                                form.setValue('selectedShifts', [...currentSelected, shift.id]);
                              } else {
                                currentSelected.splice(index, 1);
                                form.setValue('selectedShifts', currentSelected);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{shift.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(shift.date).toLocaleDateString()} • {shift.startTime} - {shift.endTime}
                                </p>
                              </div>
                              {isSelected && (
                                <CheckCircle className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
                
                {form.formState.errors.selectedShifts && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.selectedShifts.message}
                  </p>
                )}
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    onClick={() => onOpenChange(false)} 
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleNext}
                    disabled={selectedShiftIds.length === 0}
                  >
                    Next
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="repeatPattern"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Repeat Pattern</FormLabel>
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
                      <FormLabel>Repeat Until</FormLabel>
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

                <DialogFooter className="gap-2">
                  <Button type="button" onClick={handleBack} variant="outline">
                    Back
                  </Button>
                  <Button type="submit">
                    Create Repeated Shifts
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RepeatShiftsDialog;
