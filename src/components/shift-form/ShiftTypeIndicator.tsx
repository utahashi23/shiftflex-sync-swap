
import { Clock, Sun, Sunrise, Moon } from 'lucide-react';

interface ShiftTypeIndicatorProps {
  shiftType: 'day' | 'afternoon' | 'night';
}

export const ShiftTypeIndicator = ({ shiftType }: ShiftTypeIndicatorProps) => {
  return (
    <div className="mt-2 p-3 border rounded-md bg-secondary/20 flex items-center">
      <Clock className="h-5 w-5 text-primary mr-3" />
      <div className="text-sm">
        <p className="font-medium">Shift Type</p>
        <div className="flex items-center mt-1 gap-4">
          <div className="flex items-center">
            {shiftType === 'day' ? (
              <div className="p-1 bg-yellow-100 rounded-full mr-1">
                <Sunrise className="h-4 w-4 text-yellow-800" />
              </div>
            ) : shiftType === 'afternoon' ? (
              <div className="p-1 bg-orange-100 rounded-full mr-1">
                <Sun className="h-4 w-4 text-orange-800" />
              </div>
            ) : (
              <div className="p-1 bg-blue-100 rounded-full mr-1">
                <Moon className="h-4 w-4 text-blue-800" />
              </div>
            )}
            <span>{shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} Shift</span>
          </div>
        </div>
      </div>
    </div>
  );
};
