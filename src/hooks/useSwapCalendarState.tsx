
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSwapCalendarData } from './swapCalendar/useSwapCalendarData';
import { createSwapHelpers } from './swapCalendar/helpers';
import { createCalendarRenderer } from './swapCalendar/renderCalendar';
import { useSwapCalendarActions } from './swapCalendar/useSwapCalendarActions';
import { AcceptableShiftTypes } from './swapCalendar/types';
import { Shift } from '@/hooks/useShiftData';
import { toast } from './use-toast';

export const useSwapCalendarState = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [selectedSwapDates, setSelectedSwapDates] = useState<string[]>([]);
  const [acceptableShiftTypes, setAcceptableShiftTypes] = useState<AcceptableShiftTypes>({
    day: true,
    afternoon: true,
    night: true,
  });
  
  const { user } = useAuth();
  const { shifts, isLoading, setShifts } = useSwapCalendarData(currentDate, user?.id);

  // When a shift is selected, set the corresponding shift type to true
  useEffect(() => {
    if (selectedShift) {
      // Default to enabling the same shift type as the selected shift
      setAcceptableShiftTypes({
        day: selectedShift.type === 'day',
        afternoon: selectedShift.type === 'afternoon',
        night: selectedShift.type === 'night',
      });
      
      console.log(`Setting initial acceptableShiftTypes based on selected shift type: ${selectedShift.type}`);
    }
  }, [selectedShift]);

  // Create the state object that will be passed to helpers
  const state = {
    currentDate,
    shifts,
    selectedShift,
    swapMode,
    selectedSwapDates,
    acceptableShiftTypes,
    isLoading
  };

  // Set state functions
  const setStateActions = {
    setSelectedShift,
    setSwapMode,
    setSelectedSwapDates,
    setCurrentDate,
    setAcceptableShiftTypes
  };

  // Create helpers
  const helpers = createSwapHelpers(state);

  // Create actions
  const actions = useSwapCalendarActions(
    state, 
    setStateActions, 
    helpers, 
    user?.id
  );

  // Create calendar renderer
  const { renderCalendar } = createCalendarRenderer(
    state,
    helpers,
    actions.handleShiftClick,
    actions.toggleDateSelection
  );

  return {
    currentDate,
    shifts,
    setShifts,
    selectedShift,
    setSelectedShift,
    swapMode,
    selectedSwapDates,
    acceptableShiftTypes,
    isLoading,
    ...helpers,
    ...actions,
    renderCalendar,
    setAcceptableShiftTypes
  };
};
