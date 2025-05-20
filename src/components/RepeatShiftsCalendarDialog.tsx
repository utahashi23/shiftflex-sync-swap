
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shift } from '@/hooks/useShiftData';
import { formatDateString, getDaysInMonth, getFirstDayOfMonth } from '@/utils/dateUtils';
import { Calendar, Clock, Repeat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RepeatShiftsCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: Shift[];
  onSuccess: (count: number) => void;
}

const RepeatShiftsCalendarDialog: React.FC<RepeatShiftsCalendarDialogProps> = ({
  open,
  onOpenChange,
  shifts,
  onSuccess
}) => {
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([]);
  const [repeatCount, setRepeatCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<'select' | 'configure'>('select');
  const [currentDate] = useState(new Date());

  const handleShiftToggle = (shift: Shift) => {
    setSelectedShifts(prev => {
      const exists = prev.some(s => s.id === shift.id);
      if (exists) {
        return prev.filter(s => s.id !== shift.id);
      } else {
        return [...prev, shift];
      }
    });
  };

  const handleRepeatSubmit = async () => {
    if (selectedShifts.length === 0) {
      toast({
        title: "No shifts selected",
        description: "Please select at least one shift to repeat",
        variant: "destructive"
      });
      return;
    }

    if (repeatCount < 1) {
      toast({
        title: "Invalid repeat count",
        description: "Please enter a repeat count greater than 0",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let successCount = 0;
      
      for (const shift of selectedShifts) {
        const shiftDate = new Date(shift.date);
        
        for (let i = 1; i <= repeatCount; i++) {
          // Calculate the new date by adding 7 days (1 week) for each repetition
          const newDate = new Date(shiftDate);
          newDate.setDate(newDate.getDate() + (7 * i));
          
          // Format the date as YYYY-MM-DD
          const formattedDate = newDate.toISOString().split('T')[0];
          
          // Check if there's already a shift on this date to avoid duplicates
          const { data: existingShifts } = await supabase
            .from('shifts')
            .select('id')
            .eq('date', formattedDate)
            .eq('user_id', shift.userId);
            
          if (existingShifts && existingShifts.length > 0) {
            console.log(`Skip creating shift for ${formattedDate} - already exists`);
            continue;
          }
          
          // Clone the shift with the new date
          const { error } = await supabase
            .from('shifts')
            .insert([{
              user_id: shift.userId,
              date: formattedDate,
              start_time: shift.startTime,
              end_time: shift.endTime,
              truck_name: shift.title,
              colleague_type: shift.colleagueType
            }]);
            
          if (error) {
            console.error('Error repeating shift:', error);
          } else {
            successCount++;
          }
        }
      }
      
      toast({
        title: "Shifts repeated",
        description: `Created ${successCount} new shifts based on your selection.`
      });
      
      if (successCount > 0) {
        onSuccess(successCount);
      }
      
      // Reset state and close dialog
      setSelectedShifts([]);
      setRepeatCount(1);
      setCurrentStep('select');
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error repeating shifts:', error);
      toast({
        title: "Error",
        description: "Failed to repeat shifts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const daysArray = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(
        <div key={`empty-${i}`} className="calendar-cell"></div>
      );
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= days; day++) {
      const dateStr = formatDateString(year, month, day);
      const shift = shifts.find(s => s.date === dateStr);
      
      const isSelected = shift && selectedShifts.some(s => s.id === shift.id);
      
      daysArray.push(
        <div 
          key={day}
          className={`calendar-cell ${!shift ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'} ${isSelected ? 'bg-blue-100' : ''}`}
          onClick={() => shift && handleShiftToggle(shift)}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-sm font-medium">{day}</span>
            {shift && isSelected && (
              <Checkbox checked={true} className="h-4 w-4" />
            )}
          </div>
          
          {shift && (
            <>
              <div className="text-xs font-medium mb-0.5 truncate">{shift.title}</div>
              <div className="text-xs text-gray-500">{shift.startTime} - {shift.endTime}</div>
            </>
          )}
        </div>
      );
    }
    
    return daysArray;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh]">
        <DialogTitle>
          {currentStep === 'select' ? 'Select Shifts to Repeat' : 'Configure Repeat Options'}
        </DialogTitle>
        
        <ScrollArea className="h-full max-h-[70vh]">
          {currentStep === 'select' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Select the shifts you want to repeat. Only days with existing shifts can be selected.
              </p>
              
              <div className="grid grid-cols-7 gap-1 min-h-[400px]">
                {renderCalendarGrid()}
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Selected shifts: {selectedShifts.length}</span>
                  {selectedShifts.length > 0 && (
                    <Button 
                      onClick={() => setCurrentStep('configure')}
                      size="sm"
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="repeat-count">Repeat shifts for the next</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="repeat-count"
                    type="number"
                    min="1"
                    max="12"
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                    className="w-16 p-2 border rounded"
                  />
                  <span>weeks</span>
                </div>
                <p className="text-sm text-gray-500">
                  Selected shifts will be repeated weekly for the specified number of weeks.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Selected shifts</Label>
                <div className="border rounded-md overflow-hidden">
                  {selectedShifts.map((shift) => (
                    <div 
                      key={shift.id} 
                      className="flex items-center justify-between p-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{new Date(shift.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{shift.startTime} - {shift.endTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <Repeat className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Total shifts to create: {selectedShifts.length * repeatCount}</p>
                    <p className="text-sm text-amber-700">
                      This will create new shifts for the next {repeatCount} week{repeatCount !== 1 ? 's' : ''} based on your selection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          {currentStep === 'select' ? (
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setCurrentStep('select')}
              >
                Back
              </Button>
              <Button 
                onClick={handleRepeatSubmit}
                isLoading={isLoading}
                disabled={isLoading || selectedShifts.length === 0}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Repeat Shifts
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RepeatShiftsCalendarDialog;
