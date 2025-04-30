
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Shift } from '@/hooks/useShiftData';
import { SwapCalendarState, SwapCalendarHelpers, AcceptableShiftTypes } from './types';

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
        requester_id: userId,
        requester_shift_id: selectedShift.id,
        selected_dates: selectedSwapDates,
        acceptable_types: acceptableShiftTypes
      });
      
      // Create the swap request in the database
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .insert({
          requester_id: userId,
          requester_shift_id: selectedShift.id,
          status: 'pending'
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      if (!data || !data.id) {
        throw new Error('Failed to get ID for new swap request');
      }
      
      // Now we would store the preferred dates in a separate table
      // For now, we'll create a separate table to store the preferred dates
      // This is just a placeholder until we implement the actual database schema
      console.log('Created swap request with ID:', data.id);
      console.log('Selected swap dates:', selectedSwapDates);
      
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
