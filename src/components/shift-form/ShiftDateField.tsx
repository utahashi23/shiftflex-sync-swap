
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { X } from 'lucide-react';

interface ShiftDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  multiSelect?: boolean;
  selectedDates?: Date[];
  onMultiDateChange?: (dates: Date[]) => void;
}

export const ShiftDateField = ({ 
  value, 
  onChange, 
  multiSelect = false,
  selectedDates = [],
  onMultiDateChange
}: ShiftDateFieldProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (multiSelect && onMultiDateChange) {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check if the date is already selected
      const alreadySelected = selectedDates.some(
        selectedDate => format(selectedDate, 'yyyy-MM-dd') === dateStr
      );
      
      if (alreadySelected) {
        // Remove the date if already selected
        onMultiDateChange(selectedDates.filter(
          d => format(d, 'yyyy-MM-dd') !== dateStr
        ));
      } else {
        // Add the date if not already selected
        onMultiDateChange([...selectedDates, date]);
      }
    } else {
      // Single date selection
      onChange(format(date, 'yyyy-MM-dd'));
      setIsCalendarOpen(false);
    }
  };

  const handleRemoveDate = (indexToRemove: number) => {
    if (multiSelect && onMultiDateChange) {
      onMultiDateChange(
        selectedDates.filter((_, index) => index !== indexToRemove)
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <Label htmlFor="shift-date">Date{multiSelect ? 's' : ''}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <AlertCircle className="h-4 w-4 text-gray-400" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                {multiSelect 
                  ? "Select multiple dates on the calendar" 
                  : "Select a date on the calendar"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {multiSelect ? (
        <>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                {selectedDates.length > 0 
                  ? `${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''} selected` 
                  : "Select dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => {
                  if (onMultiDateChange && dates) {
                    onMultiDateChange(dates);
                  }
                }}
                initialFocus
                className="p-3"
              />
            </PopoverContent>
          </Popover>
          
          {/* Display selected dates */}
          {selectedDates.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedDates.map((date, index) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1"
                >
                  {format(date, 'MMM d, yyyy')}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveDate(index)}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </>
      ) : (
        <Input
          id="shift-date"
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
      )}
    </div>
  );
};
