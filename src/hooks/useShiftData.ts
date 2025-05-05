
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getMonthDateRange } from '@/utils/dateUtils';
import { getShiftType } from '@/utils/shiftUtils';

export interface Shift {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
  colleagueType: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
}

export const useShiftData = (currentDate: Date, userId?: string) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        
        // Fetch shifts for the current month
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
          
        if (error) throw error;
        
        // Format the shifts for the calendar with updated shift type logic
        const formattedShifts: Shift[] = data?.map(shift => {
          // Use the common getShiftType function for consistency
          const type = getShiftType(shift.start_time);
          
          // Create title from truck name or use default format
          const title = shift.truck_name || `Shift-${shift.id.substring(0, 5)}`;
          
          // Ensure colleagueType is one of the valid union types
          const colleagueType = validateColleagueType(shift.colleague_type);
          
          return {
            id: shift.id,
            date: shift.date,
            title,
            startTime: shift.start_time.substring(0, 5), // Format as HH:MM
            endTime: shift.end_time.substring(0, 5),     // Format as HH:MM
            type,
            colleagueType
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

  return { shifts, isLoading };
};

// Helper function to validate colleague type
export const validateColleagueType = (type: string | null): 'Qualified' | 'Graduate' | 'ACO' | 'Unknown' => {
  if (!type) return 'Unknown';
  
  // Validate that the type is one of the allowed values
  switch (type) {
    case 'Qualified':
    case 'Graduate':
    case 'ACO':
      return type;
    default:
      return 'Unknown';
  }
};

// Helper functions for working with shifts
export const getShiftForDate = (shifts: Shift[], dateStr: string): Shift | undefined => {
  return shifts.find(shift => shift.date === dateStr);
};

export const hasShiftOnDate = (shifts: Shift[], dateStr: string): boolean => {
  return shifts.some(shift => shift.date === dateStr);
};
