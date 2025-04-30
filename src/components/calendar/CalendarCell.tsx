
import React from 'react';
import { Sun, Sunrise, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarShift } from '@/types/calendarTypes';

interface CalendarCellProps {
  day: number;
  dateStr: string;
  shift: CalendarShift | undefined;
  isSelected: boolean;
  onClick: () => void;
}

const CalendarCell = ({ day, dateStr, shift, isSelected, onClick }: CalendarCellProps) => {
  if (!day) {
    return <div className="calendar-cell"></div>;
  }

  return (
    <div 
      className={cn(
        "calendar-cell cursor-pointer hover:bg-secondary/30 transition-colors",
        shift && "has-shift",
        isSelected && "selected",
      )}
      onClick={onClick}
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
};

export default CalendarCell;
