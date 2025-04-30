import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, Sun, Sunrise, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

// Types
interface Shift {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
  colleagueType?: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
}

interface ShiftCalendarProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift | null) => void;
}

const ShiftCalendar = ({ 
  selectedDate, 
  setSelectedDate, 
  selectedShift, 
  setSelectedShift 
}: ShiftCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchShifts = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Get the year and month from the current date
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // JavaScript months are 0-based
        
        // Create date range for the current month
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
        
        // Fetch shifts for the current month
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
          
        if (error) throw error;
        
        // Format the shifts for the calendar
        const formattedShifts: Shift[] = data?.map(shift => {
          // Determine shift type based on start time
          let type: 'day' | 'afternoon' | 'night' = 'day';
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour >= 5 && startHour < 13) {
            type = 'day';
          } else if (startHour >= 13 && startHour < 21) {
            type = 'afternoon';
          } else {
            type = 'night';
          }
          
          // Create title from truck name or use default format
          const title = shift.truck_name || `Shift-${shift.id.substring(0, 5)}`;
          
          return {
            id: shift.id,
            date: shift.date,
            title,
            startTime: shift.start_time.substring(0, 5), // Format as HH:MM
            endTime: shift.end_time.substring(0, 5),     // Format as HH:MM
            type,
            colleagueType: 'Unknown'  // Default value as we don't have colleague type in the database yet
          };
        }) || [];
        
        setShifts(formattedShifts);
      } catch (error) {
        console.error('Error fetching shifts:', error);
        toast({
          title: "Failed to load shifts",
          description: "There was a problem loading your shifts. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchShifts();
  }, [currentDate, user]);

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getShiftForDate = (dateStr: string) => {
    return shifts.find(shift => shift.date === dateStr);
  };
  
  // Check if a date has a shift
  const hasShift = (dateStr: string) => {
    return shifts.some(shift => shift.date === dateStr);
  };

  // Format date to YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (date: Date, shift: Shift | null) => {
    if (shift) {
      setSelectedShift(shift);
    } else {
      setSelectedShift(null);
    }
    setSelectedDate(date);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    
    const daysArray = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(<div key={`empty-${i}`} className="calendar-cell"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= days; day++) {
      const dateStr = formatDateString(year, month, day);
      const dateObj = new Date(dateStr);
      const shift = getShiftForDate(dateStr);
      
      const isSelected = selectedShift?.date === dateStr || 
        (selectedDate && dateObj.toDateString() === selectedDate.toDateString() && !selectedShift);
        
      daysArray.push(
        <div 
          key={day} 
          className={cn(
            "calendar-cell cursor-pointer hover:bg-secondary/30 transition-colors",
            shift && "has-shift",
            isSelected && "selected",
          )}
          onClick={() => handleDateClick(dateObj, shift || null)}
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
    }
    
    return daysArray;
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col p-4">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          <h2 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
            Next
          </Button>
        </div>
      </div>
      
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-medium py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 min-h-[500px]">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="calendar-cell">
              <div className="animate-pulse h-full">
                <div className="bg-gray-200 h-4 w-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-3 w-2/3 rounded mb-1"></div>
                <div className="bg-gray-200 h-2 w-1/2 rounded"></div>
              </div>
            </div>
          ))
        ) : (
          // Actual calendar
          renderCalendar()
        )}
      </div>
      
      {/* Calendar Legend */}
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
    </div>
  );
};

export default ShiftCalendar;
