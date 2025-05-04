
import React from 'react';
import { SwapCalendarCell } from './calendar/SwapCalendarCell';
import { SwapSelectionPanel } from './calendar/SwapSelectionPanel';
import { CalendarHeader, WeekdayHeader } from './calendar/CalendarHeader';
import { CalendarLegend } from './calendar/CalendarLegend';
import { useSwapCalendarState } from '@/hooks/useSwapCalendarState';

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
  } = useSwapCalendarState();

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
