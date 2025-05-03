
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Shift } from '@/hooks/useShiftData';
import { AcceptableShiftTypes } from './types';
import { createSwapRequestApi } from '@/hooks/swap-requests/api';

// Update the useSwapCalendarActions hook to work with our database directly
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
      
      // Format preferred dates for the API - each date with its accepted types
      const preferredDates = selectedSwapDates.map(dateStr => ({
        date: dateStr,
        acceptedTypes: acceptedTypes
      }));
      
      console.log('Creating swap request with preferred dates:', preferredDates);
      
      // Use our API function that calls the edge function
      const { success } = await createSwapRequestApi(
        selectedShift.id,
        preferredDates
      );
      
      if (success) {
        toast({
          title: "Swap Request Created",
          description: "Your shift swap request has been saved.",
        });
  
        // Reset the swap mode and selected dates
        setSwapMode(false);
        setSelectedSwapDates([]);
        setSelectedShift(null);
      }
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
  
  // Updated to accept a number parameter instead of 'prev' | 'next'
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
