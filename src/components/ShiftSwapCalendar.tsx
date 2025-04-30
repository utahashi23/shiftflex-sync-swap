
import React from 'react';
import { SwapCalendarCell } from './calendar/SwapCalendarCell';
import { SwapSelectionPanel } from './calendar/SwapSelectionPanel';
import { CalendarHeader, WeekdayHeader } from './calendar/CalendarHeader';
import { CalendarLegend } from './calendar/CalendarLegend';
import { useSwapCalendarState } from '@/hooks/useSwapCalendarState';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import { useSwapMatcher } from '@/hooks/useSwapMatcher';

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

  const { findSwapMatches, isProcessing } = useSwapMatcher();

  return (
    <div className="flex flex-col">
      <div className="flex justify-end mb-4">
        <Button
          onClick={findSwapMatches}
          disabled={isProcessing}
          className="bg-green-500 hover:bg-green-600 text-white"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
          {isProcessing ? 'Finding Matches...' : 'Find Matches'}
        </Button>
      </div>
      
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
