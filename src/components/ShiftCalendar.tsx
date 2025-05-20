
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useShiftData, getShiftForDate, Shift } from '@/hooks/useShiftData';
import { getDaysInMonth, getFirstDayOfMonth, formatDateString } from '@/utils/dateUtils';
import { CalendarDayCell, CalendarSkeletonCell } from './calendar/CalendarDayCell';
import { CalendarHeader, WeekdayHeader } from './calendar/CalendarHeader';
import { CalendarLegend } from './calendar/CalendarLegend';
import { Button } from './ui/button';
import { Repeat } from 'lucide-react';
import RepeatShiftsCalendarDialog from './RepeatShiftsCalendarDialog';

interface ShiftCalendarProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift | null) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const ShiftCalendar = ({ 
  selectedDate, 
  setSelectedDate, 
  selectedShift, 
  setSelectedShift,
  currentDate,
  setCurrentDate
}: ShiftCalendarProps) => {
  const { user } = useAuth();
  const { shifts, isLoading, refetchShifts } = useShiftData(currentDate, user?.id);
  const [isRepeatDialogOpen, setIsRepeatDialogOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([]);

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

  const handleToggleSelectMode = () => {
    if (isSelectMode) {
      // Exit select mode
      setIsSelectMode(false);
      setSelectedShifts([]);
    } else {
      // Enter select mode
      setIsSelectMode(true);
    }
  };

  const handleOpenRepeatDialog = () => {
    if (selectedShifts.length === 0) {
      return;
    }
    setIsRepeatDialogOpen(true);
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
      <div className="flex justify-between items-center mb-4">
        <CalendarHeader currentDate={currentDate} onChangeMonth={changeMonth} />
        
        <div className="flex gap-2">
          <Button 
            variant={isSelectMode ? "secondary" : "outline"} 
            onClick={handleToggleSelectMode}
            className={isSelectMode ? "bg-blue-100 text-blue-700 border-blue-300" : ""}
          >
            {isSelectMode ? `Selected: ${selectedShifts.length}` : "Select Shifts"}
          </Button>
          
          {isSelectMode && (
            <Button 
              onClick={handleOpenRepeatDialog} 
              disabled={selectedShifts.length === 0}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Repeat className="h-4 w-4 mr-2" />
              Repeat
            </Button>
          )}
        </div>
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
      
      {/* Repeat Shifts Dialog - uses the existing RepeatShiftsCalendarDialog but with pre-selected shifts */}
      <RepeatShiftsCalendarDialog
        open={isRepeatDialogOpen}
        onOpenChange={setIsRepeatDialogOpen}
        shifts={shifts}
        onSuccess={handleRepeatSuccess}
      />
    </div>
  );
};

export default ShiftCalendar;
