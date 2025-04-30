
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, Sun, Sunrise, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock shift data
const mockShifts = [
  { id: 1, date: '2025-05-01', title: '02-MAT01', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
  { id: 2, date: '2025-05-03', title: '04-MAT03', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'Graduate' },
  { id: 3, date: '2025-05-05', title: '09-MAT12', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'ACO' },
  { id: 4, date: '2025-05-07', title: '06-MAT07', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
  { id: 5, date: '2025-05-10', title: '08-MAT11', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'Unknown' },
  { id: 6, date: '2025-05-13', title: '02-MAT01', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'ACO' },
  { id: 7, date: '2025-05-18', title: '09-MAT12', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Graduate' },
  { id: 8, date: '2025-05-21', title: '04-MAT03', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'Qualified' },
  { id: 9, date: '2025-05-25', title: '06-MAT07', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'Unknown' },
  { id: 10, date: '2025-05-28', title: '08-MAT11', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
];

// Types
interface Shift {
  id: number;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
  colleagueType: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
}

interface ShiftCalendarProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift | null) => void;
}

const ShiftCalendar = ({ 
  selectedDate, 
  setSelectedDate, 
  selectedShift, 
  setSelectedShift 
}: ShiftCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>(mockShifts);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading data from database
    setIsLoading(true);
    
    const timer = setTimeout(() => {
      setShifts(mockShifts);
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

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

  // Format date to YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (date: Date, shift: Shift | null) => {
    if (shift) {
      setSelectedShift(shift);
    } else {
      setSelectedShift(null);
    }
    setSelectedDate(date);
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
      const dateObj = new Date(dateStr);
      const shift = getShiftForDate(dateStr);
      
      const isSelected = selectedShift?.date === dateStr || 
        (selectedDate && dateObj.toDateString() === selectedDate.toDateString() && !selectedShift);
        
      daysArray.push(
        <div 
          key={day} 
          className={cn(
            "calendar-cell cursor-pointer hover:bg-secondary/30 transition-colors",
            shift && "has-shift",
            isSelected && "selected",
          )}
          onClick={() => handleDateClick(dateObj, shift || null)}
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
    <div className="flex flex-col p-4">
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
      <div className="grid grid-cols-7 gap-1 min-h-[500px]">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="calendar-cell">
              <div className="animate-pulse h-full">
                <div className="bg-gray-200 h-4 w-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-3 w-2/3 rounded mb-1"></div>
                <div className="bg-gray-200 h-2 w-1/2 rounded"></div>
              </div>
            </div>
          ))
        ) : (
          // Actual calendar
          renderCalendar()
        )}
      </div>
      
      {/* Calendar Legend */}
      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        <div className="flex items-center">
          <div className="p-1 bg-yellow-100 rounded-full mr-1">
            <Sunrise className="h-3.5 w-3.5 text-yellow-800" />
          </div>
          <span className="text-xs">Day Shift</span>
        </div>
        <div className="flex items-center">
          <div className="p-1 bg-orange-100 rounded-full mr-1">
            <Sun className="h-3.5 w-3.5 text-orange-800" />
          </div>
          <span className="text-xs">Afternoon Shift</span>
        </div>
        <div className="flex items-center">
          <div className="p-1 bg-blue-100 rounded-full mr-1">
            <Moon className="h-3.5 w-3.5 text-blue-800" />
          </div>
          <span className="text-xs">Night Shift</span>
        </div>
      </div>
    </div>
  );
};

export default ShiftCalendar;
