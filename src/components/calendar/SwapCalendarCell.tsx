
import React from 'react';
import { cn } from '@/lib/utils';
import { Sunrise, Sun, Moon } from 'lucide-react';
import { Shift } from '@/hooks/useShiftData';
import { AcceptableShiftTypes } from '@/hooks/swapCalendar/types';

interface SwapCalendarCellProps {
  day?: number;
  dateStr?: string;
  shift?: Shift;
  isSelected: boolean;
  isDisabled?: boolean;
  isSwapSelected?: boolean;
  onClick: () => void;
  empty?: boolean;
  acceptableShiftTypes?: AcceptableShiftTypes;
}

export const SwapCalendarCell = ({
  day,
  dateStr,
  shift,
  isSelected,
  isDisabled = false,
  isSwapSelected = false,
  onClick,
  empty = false,
  acceptableShiftTypes
}: SwapCalendarCellProps) => {
  if (empty) {
    return <div className="calendar-cell"></div>;
  }

  // Create a handler function that ensures the onClick is called properly
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={cn(
        "calendar-cell relative",
        shift && "has-shift",
        isSelected && "selected",
        isDisabled ? "day-disabled bg-gray-100 cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-secondary/30",
        isSwapSelected && "day-selected bg-green-50",
        "transition-colors"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
    >
      <div className="flex justify-between items-start mb-1">
        <span className={cn("text-sm font-medium", isDisabled && "text-gray-500")}>{day}</span>
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
          <div className={cn("text-xs font-medium mb-0.5 truncate", isDisabled && "text-gray-500")}>{shift.title}</div>
          <div className={cn("shift-detail text-xs text-gray-600", isDisabled && "text-gray-500")}>{shift.startTime} - {shift.endTime}</div>
        </>
      )}
      
      {isDisabled && !shift && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-50"></div>
      )}

      {isSwapSelected && (
        <div className="absolute bottom-1 right-1">
          <span className="bg-green-500 rounded-full w-3 h-3 flex items-center justify-center"></span>
        </div>
      )}
    </div>
  );
};
