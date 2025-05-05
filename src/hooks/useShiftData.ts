
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
  colleagueType?: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
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
          .select('*, profiles:user_id(organization)')
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
          
          // Determine colleague type based on organization information
          let colleagueType: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown' = 'Unknown';
          
          // Safe access to profiles data
          const profileData = shift.profiles;
          if (profileData && typeof profileData === 'object') {
            const organization = profileData.organization;
            
            if (organization) {
              if (organization.includes('Graduate')) {
                colleagueType = 'Graduate';
              } else if (organization.includes('ACO')) {
                colleagueType = 'ACO';
              } else if (organization.includes('Qualified')) {
                colleagueType = 'Qualified';
              }
            }
          }
          
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

// Helper functions for working with shifts
export const getShiftForDate = (shifts: Shift[], dateStr: string): Shift | undefined => {
  return shifts.find(shift => shift.date === dateStr);
};

export const hasShiftOnDate = (shifts: Shift[], dateStr: string): boolean => {
  return shifts.some(shift => shift.date === dateStr);
};
