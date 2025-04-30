
import React from 'react';
import CalendarCell from './CalendarCell';
import { CalendarShift } from '@/types/calendarTypes';

interface CalendarGridProps {
  currentDate: Date;
  shifts: CalendarShift[];
  selectedShift: CalendarShift | null;
  onShiftClick: (shift: CalendarShift) => void;
  isLoading: boolean;
}

const CalendarGrid = ({ 
  currentDate, 
  shifts, 
  selectedShift, 
  onShiftClick,
  isLoading 
}: CalendarGridProps) => {
  const getShiftForDate = (dateStr: string) => {
    return shifts.find(shift => shift.date === dateStr);
  };

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    
    const daysArray = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(<CalendarCell key={`empty-${i}`} day={0} dateStr="" shift={undefined} isSelected={false} onClick={() => {}} />);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= days; day++) {
      const dateStr = formatDateString(year, month, day);
      const shift = getShiftForDate(dateStr);
      const isSelected = selectedShift?.date === dateStr;
      
      daysArray.push(
        <CalendarCell 
          key={day} 
          day={day}
          dateStr={dateStr}
          shift={shift}
          isSelected={isSelected}
          onClick={() => shift ? onShiftClick(shift) : null}
        />
      );
    }
    
    return daysArray;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-1 mb-4">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="calendar-cell animate-pulse">
            <div className="h-4 w-4 bg-gray-200 rounded mb-1"></div>
            <div className="h-2 w-1/2 bg-gray-200 rounded mb-1"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-medium py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {renderCalendar()}
      </div>
    </>
  );
};

export default CalendarGrid;
