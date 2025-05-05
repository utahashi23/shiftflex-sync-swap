
import { cn } from '@/lib/utils';
import { Sunrise, Sun, Moon } from 'lucide-react';
import { Shift } from '@/hooks/useShiftData';

interface CalendarDayCellProps {
  day: number;
  dateStr: string;
  shift?: Shift;
  isSelected: boolean;
  onClick: () => void;
  empty?: boolean;
}

export const CalendarDayCell = ({
  day,
  dateStr,
  shift,
  isSelected,
  onClick,
  empty = false
}: CalendarDayCellProps) => {
  if (empty) {
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

export const CalendarSkeletonCell = () => {
  return (
    <div className="calendar-cell">
      <div className="animate-pulse h-full">
        <div className="bg-gray-200 h-4 w-4 rounded mb-2"></div>
        <div className="bg-gray-200 h-3 w-2/3 rounded mb-1"></div>
        <div className="bg-gray-200 h-2 w-1/2 rounded"></div>
      </div>
    </div>
  );
};
