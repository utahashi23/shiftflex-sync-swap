
import React from 'react';
import { useSwapCalendarState } from '@/hooks/useSwapCalendarState';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SwapCalendar = () => {
  const {
    currentDate,
    renderCalendar,
    handleRequestSwap,
    handleCancelSwapRequest,
    handleSaveSwapRequest,
    changeMonth,
    selectedShift,
    swapMode,
    selectedSwapDates,
    isLoading,
    acceptableShiftTypes,
    setAcceptableShiftTypes
  } = useSwapCalendarState();

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => changeMonth(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 p-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>

      {selectedShift && !swapMode && (
        <div className="mt-6 p-4 border rounded-lg bg-blue-50">
          <h4 className="font-semibold mb-2">Selected Shift</h4>
          <p className="text-sm mb-4">
            {format(new Date(selectedShift.date), 'EEEE, MMMM d, yyyy')} - {selectedShift.title}
          </p>
          
          <Button onClick={handleRequestSwap}>
            Request Swap
          </Button>
        </div>
      )}

      {swapMode && (
        <div className="mt-6 space-y-4">
          <div className="p-4 border rounded-lg bg-blue-50">
            <h4 className="font-semibold mb-2">Select Dates to Swap With</h4>
            <p className="text-sm mb-2">
              Select days you would like to work instead
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedSwapDates.length > 0 ? (
                selectedSwapDates.map(date => (
                  <div key={date} className="bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded">
                    {format(new Date(date), 'MMM d')}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No dates selected</p>
              )}
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium">Acceptable shift types:</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptableShiftTypes.day}
                    onChange={() => setAcceptableShiftTypes({
                      ...acceptableShiftTypes,
                      day: !acceptableShiftTypes.day
                    })}
                    className="rounded"
                  />
                  Day
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptableShiftTypes.afternoon}
                    onChange={() => setAcceptableShiftTypes({
                      ...acceptableShiftTypes,
                      afternoon: !acceptableShiftTypes.afternoon
                    })}
                    className="rounded"
                  />
                  Afternoon
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptableShiftTypes.night}
                    onChange={() => setAcceptableShiftTypes({
                      ...acceptableShiftTypes,
                      night: !acceptableShiftTypes.night
                    })}
                    className="rounded"
                  />
                  Night
                </label>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleCancelSwapRequest}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSwapRequest}
                disabled={selectedSwapDates.length === 0 || isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapCalendar;
