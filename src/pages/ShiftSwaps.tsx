
import { useState } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ImprovedShiftSwaps from '@/components/ImprovedShiftSwaps';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };
  
  const clearDate = () => {
    setSelectedDate(undefined);
  };
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your shift swaps
          {isAdmin && <span className="ml-2 text-blue-500">(Admin Access)</span>}
        </p>
      </div>

      {/* Date filter */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Filter by date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        {selectedDate && (
          <Button variant="ghost" size="sm" onClick={clearDate}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Improved Shift Swaps System */}
      <div>
        <ImprovedShiftSwaps selectedDate={selectedDate} />
      </div>
    </AppLayout>
  );
};

export default ShiftSwaps;
