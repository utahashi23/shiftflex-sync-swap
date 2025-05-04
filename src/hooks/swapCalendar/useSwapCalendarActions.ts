import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Shift } from '@/hooks/useShiftData';
import { SwapCalendarState, SwapCalendarHelpers, AcceptableShiftTypes } from './types';
import { normalizeDate } from '@/utils/dateUtils';

export const useSwapCalendarActions = (
  state: SwapCalendarState,
  setState: {
    setSelectedShift: (shift: Shift | null) => void;
    setSwapMode: (mode: boolean) => void;
    setSelectedSwapDates: React.Dispatch<React.SetStateAction<string[]>>;
    setCurrentDate: (date: Date) => void;
    setAcceptableShiftTypes: React.Dispatch<React.SetStateAction<AcceptableShiftTypes>>;
  },
  helpers: SwapCalendarHelpers,
  userId?: string
) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { isDateDisabled } = helpers;
  const { selectedShift, selectedSwapDates, acceptableShiftTypes } = state;

  const toggleDateSelection = (dateStr: string) => {
    if (!state.swapMode || isDateDisabled(dateStr)) return;
    
    setState.setSelectedSwapDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };

  const handleShiftClick = (shift: Shift) => {
    if (state.swapMode) return; // Do nothing if already in swap mode
    setState.setSelectedShift(shift);
  };

  const handleRequestSwap = () => {
    setState.setSwapMode(true);
  };

  const handleSaveSwapRequest = async () => {
    if (!selectedShift || selectedSwapDates.length === 0 || !userId) {
      toast({
        title: "Invalid Swap Request",
        description: "Please select at least one date you're willing to swap for.",
        variant: "destructive",
      });
      return;
    }
    
    setIsActionLoading(true);
    
    try {
      console.log('Creating swap request with:', {
        user_id: userId,
        shift_id: selectedShift.id,
        selected_dates: selectedSwapDates,
        acceptable_types: acceptableShiftTypes
      });
      
      // Convert acceptableShiftTypes object to array for each date
      const acceptedTypesArray: ("day" | "afternoon" | "night")[] = [];
      if (acceptableShiftTypes.day) acceptedTypesArray.push("day");
      if (acceptableShiftTypes.afternoon) acceptedTypesArray.push("afternoon");
      if (acceptableShiftTypes.night) acceptedTypesArray.push("night");
      
      // First create a swap request to get an ID
      const { data: swapRequest, error: swapRequestError } = await supabase
        .from('shift_swap_requests')
        .insert({
          requester_id: userId,
          requester_shift_id: selectedShift.id,
          status: 'pending'
        })
        .select('id')
        .single();
        
      if (swapRequestError) throw swapRequestError;
      
      if (!swapRequest || !swapRequest.id) {
        throw new Error('Failed to create swap request');
      }
      
      console.log('Created swap request with ID:', swapRequest.id);
      
      // Now store each preferred date with the request_id and shift_id
      const preferredDatesInserts = selectedSwapDates.map(dateStr => ({
        date: normalizeDate(dateStr), // Normalize date format
        accepted_types: acceptedTypesArray,
        shift_id: selectedShift.id,
        request_id: swapRequest.id
      }));
      
      const { error: preferredDatesError } = await supabase
        .from('shift_swap_preferred_dates')
        .insert(preferredDatesInserts);
        
      if (preferredDatesError) throw preferredDatesError;
      
      console.log('Stored preferred dates:', preferredDatesInserts);
      
      toast({
        title: "Swap Request Created",
        description: `Your swap request for ${selectedShift.date} has been submitted.`,
      });
      
      // Reset
      setState.setSwapMode(false);
      setState.setSelectedShift(null);
      setState.setSelectedSwapDates([]);
      
    } catch (error) {
      console.error('Error creating swap request:', error);
      toast({
        title: "Request Failed",
        description: "There was a problem creating your swap request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelSwapRequest = () => {
    setState.setSwapMode(false);
    setState.setSelectedShift(null);
    setState.setSelectedSwapDates([]);
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(state.currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setState.setCurrentDate(newDate);
  };

  return {
    toggleDateSelection,
    handleShiftClick,
    handleRequestSwap,
    handleSaveSwapRequest,
    handleCancelSwapRequest,
    changeMonth,
    isActionLoading
  };
};
