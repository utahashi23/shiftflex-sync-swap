
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
  const { currentDate, selectedShift, swapMode } = state;
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
      const isDisabled = swapMode && isDateDisabled(dateStr);
      
      daysArray.push(
        <SwapCalendarCell
          key={day}
          day={day}
          dateStr={dateStr}
          shift={shift}
          isSelected={isSelected}
          isDisabled={isDisabled}
          isSwapSelected={isSwapSelected}
          onClick={() => shift ? onShiftClick(shift) : onDateSelect(dateStr)}
        />
      );
    }
    
    return daysArray;
  };

  return { renderCalendar };
};
