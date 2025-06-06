
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sunrise, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Shift } from '@/hooks/useShiftData';

interface SwapSelectionPanelProps {
  selectedShift: Shift;
  swapMode: boolean;
  acceptableShiftTypes: {
    day: boolean;
    afternoon: boolean;
    night: boolean;
  };
  selectedSwapDates: string[];
  isLoading: boolean;
  handleRequestSwap: () => void;
  handleSaveSwapRequest: () => void;
  handleCancelSwapRequest: () => void;
  setAcceptableShiftTypes: React.Dispatch<React.SetStateAction<{
    day: boolean;
    afternoon: boolean;
    night: boolean;
  }>>;
}

export const SwapSelectionPanel = ({
  selectedShift,
  swapMode,
  acceptableShiftTypes,
  selectedSwapDates,
  isLoading,
  handleRequestSwap,
  handleSaveSwapRequest,
  handleCancelSwapRequest,
  setAcceptableShiftTypes
}: SwapSelectionPanelProps) => {
  const noShiftTypeSelected = !acceptableShiftTypes.day && !acceptableShiftTypes.afternoon && !acceptableShiftTypes.night;
  
  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">
          {swapMode ? "Request Shift Swap" : "Shift Details"}
        </h3>
        
        {/* Shift Details */}
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Date</div>
              <div className="font-medium">
                {new Date(selectedShift.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Shift Type</div>
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-medium inline-flex items-center",
                selectedShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                selectedShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                "bg-blue-100 text-blue-800"
              )}>
                {selectedShift.type === 'day' ? (
                  <Sunrise className="h-3 w-3 mr-1" />
                ) : selectedShift.type === 'afternoon' ? (
                  <Sun className="h-3 w-3 mr-1" />
                ) : (
                  <Moon className="h-3 w-3 mr-1" />
                )}
                {selectedShift.type.charAt(0).toUpperCase() + selectedShift.type.slice(1)} Shift
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Shift Title</div>
              <div className="font-medium">{selectedShift.title}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Time</div>
              <div className="font-medium">{selectedShift.startTime} - {selectedShift.endTime}</div>
            </div>
          </div>
          
          {swapMode ? (
            <>
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Acceptable Shift Types:</h4>
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-md mb-4">
                  <p className="text-sm text-amber-700 mb-2 font-medium">
                    Important: Select which shift types you're willing to accept in exchange
                  </p>
                  <p className="text-xs text-amber-600">
                    You can select multiple shift types that you're willing to accept
                  </p>
                </div>
                
                <div className="space-y-2 p-3 border rounded-md">
                  <div className="flex items-center">
                    <Checkbox 
                      id="day-shift" 
                      checked={acceptableShiftTypes.day}
                      onCheckedChange={(checked) => 
                        setAcceptableShiftTypes(prev => ({ ...prev, day: checked === true }))
                      }
                    />
                    <label htmlFor="day-shift" className="ml-2 flex items-center">
                      <div className="bg-yellow-100 text-yellow-800 p-1 rounded-md mr-2">
                        <Sunrise className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Day Shift</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox 
                      id="afternoon-shift" 
                      checked={acceptableShiftTypes.afternoon}
                      onCheckedChange={(checked) => 
                        setAcceptableShiftTypes(prev => ({ ...prev, afternoon: checked === true }))
                      }
                    />
                    <label htmlFor="afternoon-shift" className="ml-2 flex items-center">
                      <div className="bg-orange-100 text-orange-800 p-1 rounded-md mr-2">
                        <Sun className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Afternoon Shift</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <Checkbox 
                      id="night-shift" 
                      checked={acceptableShiftTypes.night}
                      onCheckedChange={(checked) => 
                        setAcceptableShiftTypes(prev => ({ ...prev, night: checked === true }))
                      }
                    />
                    <label htmlFor="night-shift" className="ml-2 flex items-center">
                      <div className="bg-blue-100 text-blue-800 p-1 rounded-md mr-2">
                        <Moon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Night Shift</span>
                    </label>
                  </div>
                </div>
                
                {noShiftTypeSelected && (
                  <div className="mt-2 text-sm text-red-500 font-medium">
                    Please select at least one shift type
                  </div>
                )}
                
                <div className="mt-4">
                  <p className="text-sm text-amber-600">
                    Select days you'd like to swap for on the calendar. You can select multiple dates.
                  </p>
                  {selectedSwapDates.length > 0 && (
                    <div className="mt-2">
                      <h4 className="font-medium mb-1">Selected swap dates:</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedSwapDates.map(date => (
                          <span key={date} className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs">
                            {new Date(date).toLocaleDateString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleSaveSwapRequest} 
                  className="flex-1"
                  disabled={isLoading || selectedSwapDates.length === 0 || noShiftTypeSelected}
                >
                  {isLoading ? "Saving..." : "Save Preferences"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelSwapRequest}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button 
              onClick={handleRequestSwap} 
              className="w-full mt-2"
            >
              Request Swap
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
