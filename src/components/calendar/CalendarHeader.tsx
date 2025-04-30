
import { Button } from "@/components/ui/button";
import { Calendar } from 'lucide-react';

interface CalendarHeaderProps {
  currentDate: Date;
  onChangeMonth: (increment: number) => void;
}

export const CalendarHeader = ({ currentDate, onChangeMonth }: CalendarHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center">
        <Calendar className="h-5 w-5 mr-2" />
        <h2 className="text-lg font-semibold">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onChangeMonth(-1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChangeMonth(1)}>
          Next
        </Button>
      </div>
    </div>
  );
};

export const WeekdayHeader = () => {
  return (
    <div className="grid grid-cols-7 gap-1 mb-1">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="text-center font-medium py-2">
          {day}
        </div>
      ))}
    </div>
  );
};
