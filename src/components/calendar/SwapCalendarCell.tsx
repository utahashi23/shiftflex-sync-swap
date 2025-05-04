
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
        "calendar-cell relative",
        shift && "has-shift",
        isSelected && "selected",
        isDisabled ? "day-disabled bg-gray-300 cursor-not-allowed" : "cursor-pointer hover:bg-secondary/30",
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
        </>
      )}
      
      {isDisabled && (
        <div className="absolute inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center">
          {acceptableShiftTypes.day || acceptableShiftTypes.afternoon ? (
            <div className="text-xs text-gray-600 font-medium text-center p-1">
              Cannot follow night shift
            </div>
          ) : (
            <div className="text-xs text-gray-600 font-medium">Unavailable</div>
          )}
        </div>
      )}
    </div>
  );
};
