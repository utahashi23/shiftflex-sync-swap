
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from '@/hooks/use-toast';
import { Calendar, Sun, Sunrise, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock shift data with proper type annotations
const mockShifts = [
  { id: 1, date: '2025-05-01', title: '02-MAT01', startTime: '07:00', endTime: '15:00', type: 'day' as const },
  { id: 2, date: '2025-05-03', title: '04-MAT03', startTime: '15:00', endTime: '23:00', type: 'afternoon' as const },
  { id: 3, date: '2025-05-05', title: '09-MAT12', startTime: '23:00', endTime: '07:00', type: 'night' as const },
  { id: 4, date: '2025-05-07', title: '06-MAT07', startTime: '07:00', endTime: '15:00', type: 'day' as const },
  { id: 5, date: '2025-05-10', title: '08-MAT11', startTime: '23:00', endTime: '07:00', type: 'night' as const },
  { id: 6, date: '2025-05-13', title: '02-MAT01', startTime: '15:00', endTime: '23:00', type: 'afternoon' as const },
  { id: 7, date: '2025-05-18', title: '09-MAT12', startTime: '07:00', endTime: '15:00', type: 'day' as const },
  { id: 8, date: '2025-05-21', title: '04-MAT03', startTime: '23:00', endTime: '07:00', type: 'night' as const },
  { id: 9, date: '2025-05-25', title: '06-MAT07', startTime: '15:00', endTime: '23:00', type: 'afternoon' as const },
  { id: 10, date: '2025-05-28', title: '08-MAT11', startTime: '07:00', endTime: '15:00', type: 'day' as const },
];

// Types
interface Shift {
  id: number;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
  colleagueType?: string;
}

const ShiftSwapCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [selectedSwapDates, setSelectedSwapDates] = useState<string[]>([]);
  const [acceptableShiftTypes, setAcceptableShiftTypes] = useState({
    day: false,
    afternoon: false,
    night: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // When a shift is selected, set the corresponding shift type to true
  useEffect(() => {
    if (selectedShift) {
      setAcceptableShiftTypes({
        day: selectedShift.type === 'day',
        afternoon: selectedShift.type === 'afternoon',
        night: selectedShift.type === 'night',
      });
    }
  }, [selectedShift]);

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getShiftForDate = (dateStr: string) => {
    return shifts.find(shift => shift.date === dateStr);
  };
  
  // Check if a date has a shift
  const hasShift = (dateStr: string) => {
    return shifts.some(shift => shift.date === dateStr);
  };

  // Check if a date is selected for swap
  const isDateSelectedForSwap = (dateStr: string) => {
    return selectedSwapDates.includes(dateStr);
  };
  
  // Format date to YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  
  // Check if date is disabled for swap selection
  const isDateDisabled = (dateStr: string) => {
    // User cannot select days they are already working
    if (hasShift(dateStr)) return true;
    
    // Check 10-hour rule
    if (acceptableShiftTypes.day || acceptableShiftTypes.afternoon) {
      // Get previous day
      const date = new Date(dateStr);
      date.setDate(date.getDate() - 1);
      const prevDateStr = date.toISOString().split('T')[0];
      
      // Check if previous day has a night shift
      const prevShift = getShiftForDate(prevDateStr);
      if (prevShift && prevShift.type === 'night') {
        return true;
      }
    }
    
    if (acceptableShiftTypes.night) {
      // Get same day
      const sameShift = getShiftForDate(dateStr);
      if (sameShift && sameShift.type === 'day') {
        return true;
      }
    }
    
    return false;
  };

  const toggleDateSelection = (dateStr: string) => {
    if (!swapMode || isDateDisabled(dateStr)) return;
    
    setSelectedSwapDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };

  const handleShiftClick = (shift: Shift) => {
    if (swapMode) return; // Do nothing if already in swap mode
    setSelectedShift(shift);
  };

  const handleRequestSwap = () => {
    setSwapMode(true);
  };

  const handleSaveSwapRequest = async () => {
    if (selectedSwapDates.length === 0) {
      toast({
        title: "No Dates Selected",
        description: "Please select at least one date you're willing to swap for.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real app, this would send data to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Swap Request Created",
        description: `Your swap request for ${selectedShift?.date} has been submitted.`,
      });
      
      // Reset
      setSwapMode(false);
      setSelectedShift(null);
      setSelectedSwapDates([]);
      
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "There was a problem creating your swap request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSwapRequest = () => {
    setSwapMode(false);
    setSelectedShift(null);
    setSelectedSwapDates([]);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    
    const daysArray = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(<div key={`empty-${i}`} className="calendar-cell"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= days; day++) {
      const dateStr = formatDateString(year, month, day);
      const shift = getShiftForDate(dateStr);
      const isSelected = selectedShift?.date === dateStr;
      const isSwapSelected = isDateSelectedForSwap(dateStr);
      const isDisabled = swapMode && isDateDisabled(dateStr);
      
      daysArray.push(
        <div 
          key={day} 
          className={cn(
            "calendar-cell cursor-pointer hover:bg-secondary/30 transition-colors",
            shift && "has-shift",
            isSelected && "selected",
            swapMode && !shift && !isDisabled && "hover:bg-green-50",
            isDisabled && "day-disabled",
            isSwapSelected && "day-selected bg-green-50"
          )}
          onClick={() => shift ? handleShiftClick(shift) : toggleDateSelection(dateStr)}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-sm font-medium">{day}</span>
            {shift && (
              <span className={cn(
                "p-1 rounded-full",
                shift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                shift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                "bg-blue-100 text-blue-800"
              )}>
                {shift.type === 'day' ? (
                  <Sunrise className="h-3 w-3" />
                ) : shift.type === 'afternoon' ? (
                  <Sun className="h-3 w-3" />
                ) : (
                  <Moon className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
          
          {shift && (
            <>
              <div className="text-xs font-medium mb-0.5 truncate">{shift.title}</div>
              <div className="shift-detail">{shift.startTime} - {shift.endTime}</div>
            </>
          )}
        </div>
      );
    }
    
    return daysArray;
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          <h2 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
            Next
          </Button>
        </div>
      </div>
      
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-medium py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {renderCalendar()}
      </div>
      
      {/* Selected Shift Panel */}
      {selectedShift && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {swapMode ? "Request Shift Swap" : "Shift Details"}
            </h3>
            
            {/* Shift Details */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Date</div>
                  <div className="font-medium">
                    {new Date(selectedShift.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Shift Type</div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium inline-flex items-center",
                    selectedShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                    selectedShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                    "bg-blue-100 text-blue-800"
                  )}>
                    {selectedShift.type === 'day' ? (
                      <Sunrise className="h-3 w-3 mr-1" />
                    ) : selectedShift.type === 'afternoon' ? (
                      <Sun className="h-3 w-3 mr-1" />
                    ) : (
                      <Moon className="h-3 w-3 mr-1" />
                    )}
                    {selectedShift.type.charAt(0).toUpperCase() + selectedShift.type.slice(1)} Shift
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Shift Title</div>
                  <div className="font-medium">{selectedShift.title}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">Time</div>
                  <div className="font-medium">{selectedShift.startTime} - {selectedShift.endTime}</div>
                </div>
              </div>
              
              {swapMode ? (
                <>
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Acceptable Shift Types:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Checkbox 
                          id="day-shift" 
                          checked={acceptableShiftTypes.day}
                          onCheckedChange={(checked) => 
                            setAcceptableShiftTypes(prev => ({ ...prev, day: checked === true }))
                          }
                        />
                        <label htmlFor="day-shift" className="ml-2 text-sm flex items-center">
                          <Sunrise className="h-3.5 w-3.5 mr-1 text-yellow-600" />
                          Day Shift
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <Checkbox 
                          id="afternoon-shift" 
                          checked={acceptableShiftTypes.afternoon}
                          onCheckedChange={(checked) => 
                            setAcceptableShiftTypes(prev => ({ ...prev, afternoon: checked === true }))
                          }
                        />
                        <label htmlFor="afternoon-shift" className="ml-2 text-sm flex items-center">
                          <Sun className="h-3.5 w-3.5 mr-1 text-orange-600" />
                          Afternoon Shift
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <Checkbox 
                          id="night-shift" 
                          checked={acceptableShiftTypes.night}
                          onCheckedChange={(checked) => 
                            setAcceptableShiftTypes(prev => ({ ...prev, night: checked === true }))
                          }
                        />
                        <label htmlFor="night-shift" className="ml-2 text-sm flex items-center">
                          <Moon className="h-3.5 w-3.5 mr-1 text-blue-600" />
                          Night Shift
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm text-amber-600">
                        Select days you'd like to swap for on the calendar. You can only select days where you are not already rostered.
                      </p>
                      {selectedSwapDates.length > 0 && (
                        <div className="mt-2">
                          <h4 className="font-medium mb-1">Selected swap dates:</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedSwapDates.map(date => (
                              <span key={date} className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs">
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleSaveSwapRequest} 
                      className="flex-1"
                      disabled={isLoading || selectedSwapDates.length === 0 || 
                        (!acceptableShiftTypes.day && !acceptableShiftTypes.afternoon && !acceptableShiftTypes.night)}
                    >
                      {isLoading ? "Saving..." : "Save Preferences"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelSwapRequest}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <Button 
                  onClick={handleRequestSwap} 
                  className="w-full mt-2"
                >
                  Request Swap
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {!selectedShift && !swapMode && (
        <div className="bg-secondary/30 border border-secondary rounded-md p-4 mt-4 text-center">
          <p className="text-gray-500">Select a rostered shift to request a swap</p>
        </div>
      )}
    </div>
  );
};

export default ShiftSwapCalendar;
