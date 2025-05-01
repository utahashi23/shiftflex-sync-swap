
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shift } from '@/hooks/useShiftData';
import { AcceptableShiftTypes } from './types';

// Update the useSwapCalendarActions hook to work with our Edge Functions
export const useSwapCalendarActions = (
  state: any, 
  setStateActions: any, 
  helpers: any,
  userId?: string
) => {
  const [isLoading, setIsLoading] = useState(false);
  const { setSelectedShift, setSwapMode, setSelectedSwapDates, setCurrentDate } = setStateActions;
  const { user } = useAuth();
  
  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
    setSwapMode(false); // Reset swap mode when selecting a new shift
    setSelectedSwapDates([]);
  };
  
  const handleRequestSwap = () => {
    setSwapMode(true);
    setSelectedSwapDates([]);
  };
  
  const handleSaveSwapRequest = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save swap requests.",
        variant: "destructive"
      });
      return;
    }

    const { selectedShift, selectedSwapDates, acceptableShiftTypes } = state;

    if (!selectedShift) {
      toast({
        title: "No Shift Selected",
        description: "Please select a shift to swap.",
        variant: "destructive"
      });
      return;
    }

    if (selectedSwapDates.length === 0) {
      toast({
        title: "No Dates Selected",
        description: "Please select at least one date to swap with.",
        variant: "destructive"
      });
      return;
    }

    const acceptedTypes = getAcceptedTypes(acceptableShiftTypes);
    if (acceptedTypes.length === 0) {
      toast({
        title: "No Shift Types Selected",
        description: "Please select at least one acceptable shift type.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the Edge Function to create a swap request with preferred days
      const { data, error } = await supabase.functions.invoke('create_swap_request', {
        body: {
          user_id: user.id,
          shift_id: selectedShift.id,
          preferred_dates: selectedSwapDates.map(date => ({
            date: date,
            accepted_types: acceptedTypes
          }))
        }
      });
      
      if (error) throw error;

      toast({
        title: "Swap Request Created",
        description: "Your shift swap request has been saved.",
      });

      // Reset the swap mode and selected dates
      setSwapMode(false);
      setSelectedSwapDates([]);
      setSelectedShift(null);

    } catch (error) {
      console.error('Error saving swap request:', error);
      toast({
        title: "Error Saving Request",
        description: "There was a problem saving your swap request.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancelSwapRequest = () => {
    setSwapMode(false);
    setSelectedSwapDates([]);
  };
  
  const toggleDateSelection = (dateStr: string) => {
    const isSelected = state.selectedSwapDates.includes(dateStr);
    
    if (isSelected) {
      setSelectedSwapDates(state.selectedSwapDates.filter((d: string) => d !== dateStr));
    } else {
      setSelectedSwapDates([...state.selectedSwapDates, dateStr]);
    }
  };
  
  const changeMonth = (direction: 'prev' | 'next') => {
    const currentDate = new Date(state.currentDate);
    let newDate;
    
    if (direction === 'prev') {
      newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    } else {
      newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    
    setCurrentDate(newDate);
  };
  
  // Helper function to get accepted types array from the acceptableShiftTypes object
  const getAcceptedTypes = (types: AcceptableShiftTypes): string[] => {
    const result: string[] = [];
    if (types.day) result.push('day');
    if (types.afternoon) result.push('afternoon');
    if (types.night) result.push('night');
    return result;
  };
  
  return {
    handleShiftClick,
    handleRequestSwap,
    handleSaveSwapRequest,
    handleCancelSwapRequest,
    toggleDateSelection,
    changeMonth,
    isLoading
  };
};
