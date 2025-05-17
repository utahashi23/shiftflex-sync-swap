
import { Shift } from '@/hooks/useShiftData';
import { AcceptableShiftTypes } from './types';
import { SwapCalendarState } from './types';

export const createSwapHelpers = (state: SwapCalendarState) => {
  const { shifts, selectedSwapDates, acceptableShiftTypes } = state;

  // Get shift for a specific date
  const getShiftForDate = (dateStr: string): Shift | undefined => {
    return shifts.find(shift => shift.date === dateStr);
  };
  
  // Check if a date has a shift
  const hasShift = (dateStr: string): boolean => {
    return shifts.some(shift => shift.date === dateStr);
  };

  // Check if a date is selected for swap
  const isDateSelectedForSwap = (dateStr: string): boolean => {
    return selectedSwapDates.includes(dateStr);
  };
  
  // Check if date is disabled for swap selection
  const isDateDisabled = (dateStr: string): boolean => {
    // User cannot select days they are already working
    if (hasShift(dateStr)) {
      console.log(`Date ${dateStr} is disabled because user has a shift`);
      return true;
    }
    
    // Check 10-hour rule: A day or afternoon shift cannot follow a night shift
    // Get previous day
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    const prevDateStr = date.toISOString().split('T')[0];
    
    // Check if previous day has a night shift
    const prevShift = getShiftForDate(prevDateStr);
    
    if (prevShift && prevShift.type === 'night') {
      // EXCEPTION: If we're swapping the night shift itself
      // Allow day and afternoon shifts on the next day
      const selectedShiftDate = state.selectedShift?.date;
      if (selectedShiftDate === prevDateStr && state.selectedShift?.type === 'night') {
        // This is the exception case - allow selecting the next day for swap
        return false;
      }
      
      // Regular case: If we're potentially selecting a day or afternoon shift
      // after a night shift that isn't the one being swapped
      if (acceptableShiftTypes.day || acceptableShiftTypes.afternoon) {
        console.log(`Date ${dateStr} is disabled due to 10-hour rule (night shift on previous day)`);
        return true;
      }
    }
    
    return false;
  };

  return {
    getShiftForDate,
    hasShift,
    isDateSelectedForSwap,
    isDateDisabled
  };
};
