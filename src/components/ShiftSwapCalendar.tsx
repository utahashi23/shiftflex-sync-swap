
import React, { useState } from 'react';
import { SwapCalendarCell } from './calendar/SwapCalendarCell';
import { SwapSelectionPanel } from './calendar/SwapSelectionPanel';
import { CalendarHeader, WeekdayHeader } from './calendar/CalendarHeader';
import { CalendarLegend } from './calendar/CalendarLegend';
import { useSwapCalendarState } from '@/hooks/useSwapCalendarState';

// Mock shift data with proper type annotations
const mockShifts = [
  { id: 1, date: '2025-05-01', title: '02-MAT01', startTime: '07:00', endTime: '15:00', type: 'day' as const },
  { id: 2, date: '2025-05-03', title: '04-MAT03', startTime: '15:00', endTime: '23:00', type: 'afternoon' as const },
  { id: 3, date: '2025-05-05', title: '09-MAT12', startTime: '23:00', endTime: '07:00', type: 'night' as const },
  { id: 4, date: '2025-05-07', title: '06-MAT07', startTime: '07:00', endTime: '15:00', type: 'day' as const },
  { id: 5, date: '2025-05-10', title: '08-MAT11', startTime: '23:00', endTime: '07:00', type: 'night' as const },
  { id: 6, date: '2025-05-13', title: '02-MAT01', startTime: '15:00', endTime: '23:00', type: 'afternoon' as const },
  { id: 7, date: '2025-05-18', title: '09-MAT12', startTime: '07:00', endTime: '15:00', type: 'day' as const },
  { id: 8, date: '2025-05-21', title: '04-MAT03', startTime: '23:00', endTime: '07:00', type: 'night' as const },
  { id: 9, date: '2025-05-25', title: '06-MAT07', startTime: '15:00', endTime: '23:00', type: 'afternoon' as const },
  { id: 10, date: '2025-05-28', title: '08-MAT11', startTime: '07:00', endTime: '15:00', type: 'day' as const },
];

const ShiftSwapCalendar = () => {
  const {
    currentDate,
    selectedShift,
    swapMode,
    selectedSwapDates,
    acceptableShiftTypes,
    isLoading,
    handleRequestSwap,
    handleSaveSwapRequest,
    handleCancelSwapRequest,
    renderCalendar,
    changeMonth,
    setAcceptableShiftTypes
  } = useSwapCalendarState(mockShifts);

  return (
    <div className="flex flex-col">
      {/* Calendar Header */}
      <CalendarHeader currentDate={currentDate} onChangeMonth={changeMonth} />
      
      {/* Days of Week Header */}
      <WeekdayHeader />
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {renderCalendar()}
      </div>
      
      {/* Selected Shift Panel */}
      {selectedShift && (
        <SwapSelectionPanel
          selectedShift={selectedShift}
          swapMode={swapMode}
          acceptableShiftTypes={acceptableShiftTypes}
          selectedSwapDates={selectedSwapDates}
          isLoading={isLoading}
          handleRequestSwap={handleRequestSwap}
          handleSaveSwapRequest={handleSaveSwapRequest}
          handleCancelSwapRequest={handleCancelSwapRequest}
          setAcceptableShiftTypes={setAcceptableShiftTypes}
        />
      )}
      
      {/* Empty State */}
      {!selectedShift && !swapMode && (
        <div className="bg-secondary/30 border border-secondary rounded-md p-4 mt-4 text-center">
          <p className="text-gray-500">Select a rostered shift to request a swap</p>
        </div>
      )}
      
      {/* Calendar Legend */}
      <CalendarLegend />
    </div>
  );
};

export default ShiftSwapCalendar;
