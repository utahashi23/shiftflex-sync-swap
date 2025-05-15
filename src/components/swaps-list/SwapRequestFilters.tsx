
import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface SwapRequestFiltersProps {
  filters: {
    date: Date | undefined;
    shiftType: string[];
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    date: Date | undefined;
    shiftType: string[];
  }>>;
}

const SwapRequestFilters = ({ filters, setFilters }: SwapRequestFiltersProps) => {
  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      date: undefined,
      shiftType: []
    });
  };

  // Get the current shift type as a single string (for the toggle group)
  const currentShiftType = filters.shiftType.length > 0 ? filters.shiftType[0] : "";

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Date filter */}
      <div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="pl-3 pr-3">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.date ? (
                format(filters.date, 'PPP')
              ) : (
                'Select date'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.date}
              onSelect={(date) => setFilters(prev => ({ ...prev, date }))}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Shift type filter */}
      <div>
        <ToggleGroup 
          type="single" 
          value={currentShiftType}
          onValueChange={(value) => setFilters(prev => ({ ...prev, shiftType: value ? [value] : [] }))}
        >
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
          <ToggleGroupItem value="afternoon">Afternoon</ToggleGroupItem>
          <ToggleGroupItem value="night">Night</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Clear filters button */}
      <Button variant="ghost" onClick={handleClearFilters} className="ml-auto">
        Clear filters
      </Button>
    </div>
  );
};

export default SwapRequestFilters;
