import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from '@/hooks/use-toast';
import { Calendar, Sun, Sunrise, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import ShiftSwapRequestForm from './ShiftSwapRequestForm';
import ShiftDetails from './ShiftDetails';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/hooks/auth/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarShift } from '@/types/calendarTypes';

const ShiftSwapCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<CalendarShift | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch shifts data
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['calendar-shifts', user?.id],
    queryFn: async () => {
      // In a real app, this would fetch from Supabase
      // const { data, error } = await supabase
      //   .from('shifts')
      //   .select('*')
      //   .eq('user_id', user?.id);
      
      // For now, return mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      return mockShifts;
    },
    enabled: !!user,
  });

  // Mock shift data with proper type annotations
  const mockShifts: CalendarShift[] = [
    { id: 1, date: '2025-05-01', title: '02-MAT01', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
    { id: 2, date: '2025-05-03', title: '04-MAT03', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'Graduate' },
    { id: 3, date: '2025-05-05', title: '09-MAT12', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'ACO' },
    { id: 4, date: '2025-05-07', title: '06-MAT07', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
    { id: 5, date: '2025-05-10', title: '08-MAT11', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'ACO' },
    { id: 6, date: '2025-05-13', title: '02-MAT01', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'Graduate' },
    { id: 7, date: '2025-05-18', title: '09-MAT12', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
    { id: 8, date: '2025-05-21', title: '04-MAT03', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'Graduate' },
    { id: 9, date: '2025-05-25', title: '06-MAT07', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'ACO' },
    { id: 10, date: '2025-05-28', title: '08-MAT11', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
  ];

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
  
  const handleShiftClick = (shift: CalendarShift) => {
    if (swapMode) return; // Do nothing if already in swap mode
    setSelectedShift(shift);
  };

  const handleRequestSwap = () => {
    setSwapMode(true);
  };

  const handleCancelSwapRequest = () => {
    setSwapMode(false);
  };

  const handleFinishSwapRequest = () => {
    setSelectedShift(null);
    setSwapMode(false);
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
      const shift = getShiftForDate(dateStr);
      const isSelected = selectedShift?.date === dateStr;
      
      daysArray.push(
        <div 
          key={day} 
          className={cn(
            "calendar-cell cursor-pointer hover:bg-secondary/30 transition-colors",
            shift && "has-shift",
            isSelected && "selected",
          )}
          onClick={() => shift ? handleShiftClick(shift) : null}
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
    <div className="flex flex-col">
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-medium py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {shiftsLoading ? (
              Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="calendar-cell animate-pulse">
                  <div className="h-4 w-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 w-1/2 bg-gray-200 rounded mb-1"></div>
                </div>
              ))
            ) : (
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
        
        <div>
          {selectedShift && swapMode ? (
            <ShiftSwapRequestForm 
              shift={selectedShift}
              onCancel={handleCancelSwapRequest}
              onComplete={handleFinishSwapRequest}
            />
          ) : selectedShift ? (
            <ShiftDetails 
              shift={selectedShift}
              onRequestSwap={handleRequestSwap}
            />
          ) : (
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Shift Selected</h3>
                <p className="text-muted-foreground">
                  Select a shift from the calendar to view details or request a swap.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftSwapCalendar;
