
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
  colleagueType?: string;
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
  acceptableShiftTypes,
  colleagueType
}: SwapCalendarCellProps) => {
  if (empty) {
    return <div className="calendar-cell"></div>;
  }

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
      onClick={isDisabled ? undefined : onClick}
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
          <div className={cn("shift-detail", isDisabled && "text-gray-500")}>{shift.startTime} - {shift.endTime}</div>
          {colleagueType && (
            <div className={cn("text-xs italic mt-0.5", isDisabled && "text-gray-500")}>
              {colleagueType}
            </div>
          )}
        </>
      )}
      
      {isDisabled && !shift && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-50"></div>
      )}
    </div>
  );
};
