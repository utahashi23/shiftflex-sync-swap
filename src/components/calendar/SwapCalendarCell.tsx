
import React from 'react';
import { cn } from '@/lib/utils';
import { Sunrise, Sun, Moon } from 'lucide-react';
import { Shift } from '@/hooks/useShiftData';

interface SwapCalendarCellProps {
  day?: number;
  dateStr?: string;
  shift?: Shift;
  isSelected: boolean;
  isDisabled?: boolean;
  isSwapSelected?: boolean;
  onClick: () => void;
  empty?: boolean;
}

export const SwapCalendarCell = ({
  day,
  dateStr,
  shift,
  isSelected,
  isDisabled = false,
  isSwapSelected = false,
  onClick,
  empty = false
}: SwapCalendarCellProps) => {
  if (empty) {
    return <div key={`empty-${day}`} className="calendar-cell"></div>;
  }

  return (
    <div 
      className={cn(
        "calendar-cell cursor-pointer hover:bg-secondary/30 transition-colors",
        shift && "has-shift",
        isSelected && "selected",
        isDisabled && "day-disabled",
        isSwapSelected && "day-selected bg-green-50"
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
