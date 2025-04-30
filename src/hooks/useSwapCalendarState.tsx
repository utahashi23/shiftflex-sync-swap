
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Shift } from '@/hooks/useShiftData';
import { getDaysInMonth, getFirstDayOfMonth, formatDateString } from '@/utils/dateUtils';
import { SwapCalendarCell } from '@/components/calendar/SwapCalendarCell';

export const useSwapCalendarState = (initialShifts: Shift[]) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
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
    
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const daysArray = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(
        <SwapCalendarCell 
          key={`empty-${i}`} 
          empty={true}
          isSelected={false}
          onClick={() => {}}
        />
      );
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= days; day++) {
      const dateStr = formatDateString(year, month, day);
      const shift = getShiftForDate(dateStr);
      const isSelected = selectedShift?.date === dateStr;
      const isSwapSelected = isDateSelectedForSwap(dateStr);
      const isDisabled = swapMode && isDateDisabled(dateStr);
      
      daysArray.push(
        <SwapCalendarCell
          key={day}
          day={day}
          dateStr={dateStr}
          shift={shift}
          isSelected={isSelected}
          isDisabled={isDisabled}
          isSwapSelected={isSwapSelected}
          onClick={() => shift ? handleShiftClick(shift) : toggleDateSelection(dateStr)}
        />
      );
    }
    
    return daysArray;
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  return {
    currentDate,
    shifts,
    setShifts,
    selectedShift,
    setSelectedShift,
    swapMode,
    selectedSwapDates,
    acceptableShiftTypes,
    isLoading,
    getShiftForDate,
    hasShift,
    isDateSelectedForSwap,
    isDateDisabled,
    toggleDateSelection,
    handleShiftClick,
    handleRequestSwap,
    handleSaveSwapRequest,
    handleCancelSwapRequest,
    renderCalendar,
    changeMonth,
    setAcceptableShiftTypes
  };
};
