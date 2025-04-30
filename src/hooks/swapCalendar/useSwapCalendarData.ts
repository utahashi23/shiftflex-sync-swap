
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getMonthDateRange } from '@/utils/dateUtils';
import { Shift } from '@/hooks/useShiftData';

export const useSwapCalendarData = (currentDate: Date, userId?: string) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchShifts = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Get date range for the current month
        const { startDate, endDate } = getMonthDateRange(currentDate);
        
        console.log('Fetching shifts with date range:', { startDate, endDate, userId });
        
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
          
        if (error) throw error;
        
        console.log('Shifts fetched:', data);
        
        // Format the shifts for the calendar
        const formattedShifts: Shift[] = data?.map(shift => {
          // Determine shift type based on start time
          let type: 'day' | 'afternoon' | 'night' = 'day';
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour <= 8) {
            type = 'day';
          } else if (startHour > 8 && startHour < 16) {
            type = 'afternoon';
          } else {
            type = 'night';
          }
          
          return {
            id: shift.id,
            date: shift.date,
            title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.start_time.substring(0, 5), // Format as HH:MM
            endTime: shift.end_time.substring(0, 5),     // Format as HH:MM
            type,
            colleagueType: 'Unknown'  // Default value
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
  }, [currentDate, userId]);

  return { shifts, isLoading, setShifts };
};
