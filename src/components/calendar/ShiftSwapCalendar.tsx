
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CalendarShift } from '@/types/calendarTypes';
import { fetchCalendarShifts } from '@/services/calendarService';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import CalendarLegend from './CalendarLegend';
import CalendarSidebar from './CalendarSidebar';

const ShiftSwapCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<CalendarShift | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  
  // Fetch shifts data
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['calendar-shifts', user?.id],
    queryFn: async () => fetchCalendarShifts(user?.id),
    enabled: !!user,
  });

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
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

  return (
    <div className="flex flex-col">
      <CalendarHeader 
        currentDate={currentDate} 
        onChangeMonth={changeMonth} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <CalendarGrid 
            currentDate={currentDate}
            shifts={shifts}
            selectedShift={selectedShift}
            onShiftClick={handleShiftClick}
            isLoading={shiftsLoading}
          />
          
          <CalendarLegend />
        </div>
        
        <div>
          <CalendarSidebar 
            selectedShift={selectedShift}
            swapMode={swapMode}
            onRequestSwap={handleRequestSwap}
            onCancelSwap={handleCancelSwapRequest}
            onCompleteSwap={handleFinishSwapRequest}
          />
        </div>
      </div>
    </div>
  );
};

export default ShiftSwapCalendar;
