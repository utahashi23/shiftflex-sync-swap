
import React from 'react';
import { SwapCalendarCell } from '@/components/calendar/SwapCalendarCell';
import { getDaysInMonth, getFirstDayOfMonth, formatDateString } from '@/utils/dateUtils';
import { SwapCalendarState, SwapCalendarHelpers } from './types';
import { Shift } from '@/hooks/useShiftData';

export const createCalendarRenderer = (
  state: SwapCalendarState, 
  helpers: SwapCalendarHelpers,
  onShiftClick: (shift: Shift) => void,
  onDateSelect: (dateStr: string) => void
) => {
  const { currentDate, selectedShift, swapMode, acceptableShiftTypes } = state;
  const { getShiftForDate, isDateDisabled, isDateSelectedForSwap } = helpers;

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const daysArray = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(
        <SwapCalendarCell 
          key={`empty-${i}`} 
          empty={true}
          isSelected={false}
          onClick={() => {}}
          acceptableShiftTypes={acceptableShiftTypes}
        />
      );
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= days; day++) {
      // Create the date in the local timezone
      const dateStr = formatDateString(year, month, day);
      const shift = getShiftForDate(dateStr);
      const isSelected = selectedShift?.date === dateStr;
      const isSwapSelected = isDateSelectedForSwap(dateStr);
      
      // If it's a day without a shift and we're not in swap mode, disable it
      const isDisabled = (swapMode) ? isDateDisabled(dateStr) : !shift;
      
      // Create proper click handler function
      const handleClick = () => {
        if (shift) {
          console.log("Clicking on shift:", shift.id, shift.date);
          onShiftClick(shift);
        } else if (swapMode) {
          console.log("Selecting date for swap:", dateStr);
          onDateSelect(dateStr);
        }
      };
      
      daysArray.push(
        <SwapCalendarCell
          key={day}
          day={day}
          dateStr={dateStr}
          shift={shift}
          isSelected={isSelected}
          isDisabled={isDisabled}
          isSwapSelected={isSwapSelected}
          onClick={handleClick}
          acceptableShiftTypes={acceptableShiftTypes}
        />
      );
    }
    
    return daysArray;
  };

  return { renderCalendar };
};
