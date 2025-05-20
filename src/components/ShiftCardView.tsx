
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Shift } from '@/hooks/useShiftData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ShiftTypeIcon from '@/components/swaps/ShiftTypeIcon';

interface ShiftCardViewProps {
  shifts: Shift[];
  isLoading: boolean;
  onSelectShift: (shift: Shift) => void;
  currentDate: Date;
  onChangeMonth: (increment: number) => void;
  onDeleteShift?: (shiftId: string) => void;
}

const ShiftCardView: React.FC<ShiftCardViewProps> = ({ 
  shifts, 
  isLoading, 
  onSelectShift,
  currentDate,
  onChangeMonth,
  onDeleteShift
}) => {
  // Group shifts by month for better organization
  const groupedShifts = shifts.reduce<Record<string, Shift[]>>((acc, shift) => {
    const date = new Date(shift.date);
    const monthYear = format(date, 'MMMM yyyy');
    
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(shift);
    
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="w-full">
            <CardContent className="p-6">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => onChangeMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="font-medium text-lg">{format(currentDate, 'MMMM yyyy')}</h2>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => onChangeMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {shifts.length === 0 ? (
        <div className="w-full text-center py-12">
          <CalendarIcon className="w-12 h-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No shifts found</h3>
          <p className="mt-2 text-gray-500">Click on a date in the calendar to add a new shift.</p>
        </div>
      ) : (
        Object.entries(groupedShifts).map(([monthYear, monthShifts]) => (
          <div key={monthYear} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {monthShifts.map((shift) => {
                const shiftDate = new Date(shift.date);
                const dayName = format(shiftDate, 'EEE');
                const dayNumber = format(shiftDate, 'd');
                
                return (
                  <Card 
                    key={shift.id || shift.date} 
                    className="w-full hover:shadow-md transition-shadow relative cursor-pointer"
                    onClick={() => onSelectShift(shift)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start">
                        <div className="flex flex-col items-center justify-center mr-4 min-w-[3rem]">
                          <span className="text-sm text-gray-500">{dayName}</span>
                          <span className="text-2xl font-bold">{dayNumber}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-lg">{shift.title}</h4>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <Clock className="h-4 w-4 mr-1" />
                            <span className="text-sm">{shift.startTime} - {shift.endTime}</span>
                          </div>
                        </div>
                        
                        {/* Delete button */}
                        {onDeleteShift && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 ml-2 absolute top-3 right-3 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              onDeleteShift(shift.id);
                            }}
                            aria-label="Delete shift"
                          >
                            <Trash2 className="h-4 w-4 text-black" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter 
                      className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500"
                    >
                      <div className="flex items-center">
                        <span className="mr-1">Shift Type:</span>
                        <ShiftTypeIcon type={shift.type} className="h-4 w-4 mx-1" />
                      </div>
                      {shift.colleagueType && shift.colleagueType !== 'Unknown' && (
                        <span className="ml-auto">{shift.colleagueType}</span>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ShiftCardView;
