
import { useState } from 'react';
import { format } from 'date-fns';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverTrigger,
  PopoverContent 
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { SwapFilters } from '@/hooks/useSwapList';

interface SwapRequestFiltersProps {
  filters: SwapFilters;
  setFilters: React.Dispatch<React.SetStateAction<SwapFilters>>;
}

const SwapRequestFilters = ({ filters, setFilters }: SwapRequestFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleDayChange = (day: string) => {
    setFilters(prev => ({
      ...prev,
      day: day ? parseInt(day) : null
    }));
  };
  
  const handleMonthChange = (month: string) => {
    setFilters(prev => ({
      ...prev,
      month: month ? parseInt(month) : null
    }));
  };
  
  const handleDateChange = (date: string) => {
    setFilters(prev => ({
      ...prev,
      specificDate: date || null
    }));
  };
  
  const handleShiftTypeChange = (type: string) => {
    setFilters(prev => ({
      ...prev,
      shiftType: type || null
    }));
  };
  
  const handleColleagueTypeChange = (type: string) => {
    setFilters(prev => ({
      ...prev,
      colleagueType: type || null
    }));
  };
  
  const clearFilters = () => {
    setFilters({
      day: null,
      month: null,
      specificDate: null,
      shiftType: null,
      colleagueType: null
    });
  };
  
  // Count active filters
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary w-5 h-5 text-xs flex items-center justify-center text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Filter Swap Requests</h4>
            <p className="text-sm text-muted-foreground">
              Narrow down the list of available swaps
            </p>
          </div>
          
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="day" className="text-xs">Day</Label>
                <Select 
                  value={filters.day?.toString() || ''} 
                  onValueChange={handleDayChange}
                >
                  <SelectTrigger id="day">
                    <SelectValue placeholder="Any day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any day</SelectItem>
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="month" className="text-xs">Month</Label>
                <Select 
                  value={filters.month?.toString() || ''} 
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Any month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any month</SelectItem>
                    {[
                      'January', 'February', 'March', 'April',
                      'May', 'June', 'July', 'August',
                      'September', 'October', 'November', 'December'
                    ].map((month, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="specific-date" className="text-xs">Specific Date</Label>
              <Input 
                id="specific-date" 
                type="date" 
                value={filters.specificDate || ''}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="shift-type" className="text-xs">Shift Type</Label>
              <Select 
                value={filters.shiftType || ''} 
                onValueChange={handleShiftTypeChange}
              >
                <SelectTrigger id="shift-type">
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any type</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="colleague-type" className="text-xs">Colleague Type</Label>
              <Select 
                value={filters.colleagueType || ''} 
                onValueChange={handleColleagueTypeChange}
              >
                <SelectTrigger id="colleague-type">
                  <SelectValue placeholder="Any colleague" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any colleague</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Graduate">Graduate</SelectItem>
                  <SelectItem value="ACO">ACO</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between pt-2">
            <Button 
              variant="ghost" 
              onClick={clearFilters}
              disabled={!activeFilterCount}
            >
              Reset
            </Button>
            <Button onClick={() => setIsOpen(false)}>Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SwapRequestFilters;
