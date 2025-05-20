
import { useAuth } from '@/hooks/useAuth';
import { useShiftData, getShiftForDate, Shift } from '@/hooks/useShiftData';
import { getDaysInMonth, getFirstDayOfMonth, formatDateString } from '@/utils/dateUtils';
import { CalendarDayCell, CalendarSkeletonCell } from './calendar/CalendarDayCell';
import { CalendarHeader, WeekdayHeader } from './calendar/CalendarHeader';
import { CalendarLegend } from './calendar/CalendarLegend';

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
  const { shifts, isLoading } = useShiftData(currentDate, user?.id);

  const handleDateClick = (date: Date, shift: Shift | null) => {
    console.log("ShiftCalendar handleDateClick called with shift:", shift);
    // First set the shift (if it exists)
    if (shift) {
      console.log("Found shift, setting in ShiftCalendar:", shift);
      setSelectedShift(shift);
    } else {
      setSelectedShift(null);
    }
    setSelectedDate(date);
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
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
      
      const isSelected = selectedShift?.date === dateStr || 
        (selectedDate && dateObj.toDateString() === selectedDate.toDateString() && !selectedShift);
        
      daysArray.push(
        <CalendarDayCell 
          key={day}
          day={day}
          dateStr={dateStr}
          shift={shift}
          isSelected={isSelected}
          onClick={() => handleDateClick(dateObj, shift || null)}
        />
      );
    }
    
    return daysArray;
  };

  return (
    <div className="flex flex-col p-4">
      <CalendarHeader currentDate={currentDate} onChangeMonth={changeMonth} />
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
    </div>
  );
};

export default ShiftCalendar;
