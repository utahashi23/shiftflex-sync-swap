
import { Sunrise, Sun, Moon } from 'lucide-react';

export const CalendarLegend = () => {
  return (
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
  );
};
