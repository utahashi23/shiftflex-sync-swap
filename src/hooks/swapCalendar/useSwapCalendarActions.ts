
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Shift } from '@/hooks/useShiftData';
import { AcceptableShiftTypes } from './types';
import { supabase } from '@/integrations/supabase/client';

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
    console.log("Handling shift click:", shift.id, shift.date);
    setSelectedShift(shift);
    setSwapMode(false); // Reset swap mode when selecting a new shift
    setSelectedSwapDates([]);
  };
  
  const handleRequestSwap = () => {
    console.log("Requesting swap");
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
      
      // Format preferred dates for the edge function with consistent property names
      const preferredDates = selectedSwapDates.map(dateStr => ({
        date: dateStr,
        acceptedTypes: acceptedTypes // Ensure consistent property naming
      }));
      
      // Enhanced logging for debugging
      console.log('Creating swap request with:', {
        shift_id: selectedShift.id,
        shift_type: selectedShift.type,
        shift_date: selectedShift.date,
        selected_dates: selectedSwapDates,
        accepted_types: acceptedTypes,
        preferred_dates: preferredDates
      });
      
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('create_swap_request', {
        body: { 
          shift_id: selectedShift.id,
          preferred_dates: preferredDates
        }
      });
      
      if (error) {
        console.error('Error creating swap request:', error);
        throw error;
      }
      
      console.log('Swap request created successfully:', data);
      
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
        description: "There was a problem saving your swap request. Please try again.",
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
    console.log("Toggling date selection:", dateStr);
    const isSelected = state.selectedSwapDates.includes(dateStr);
    
    if (isSelected) {
      setSelectedSwapDates(state.selectedSwapDates.filter((d: string) => d !== dateStr));
    } else {
      setSelectedSwapDates([...state.selectedSwapDates, dateStr]);
    }
  };
  
  const changeMonth = (increment: number) => {
    const currentDate = new Date(state.currentDate);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1);
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
