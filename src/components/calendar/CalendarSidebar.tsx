
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import ShiftDetails from '@/components/ShiftDetails';
import ShiftSwapRequestForm from '@/components/ShiftSwapRequestForm';
import { CalendarShift } from '@/types/calendarTypes';

interface CalendarSidebarProps {
  selectedShift: CalendarShift | null;
  swapMode: boolean;
  onRequestSwap: () => void;
  onCancelSwap: () => void;
  onCompleteSwap: () => void;
}

const CalendarSidebar = ({
  selectedShift,
  swapMode,
  onRequestSwap,
  onCancelSwap,
  onCompleteSwap
}: CalendarSidebarProps) => {
  if (selectedShift && swapMode) {
    return (
      <ShiftSwapRequestForm 
        shift={selectedShift}
        onCancel={onCancelSwap}
        onComplete={onCompleteSwap}
      />
    );
  } 
  
  if (selectedShift) {
    return (
      <ShiftDetails 
        shift={selectedShift}
        onRequestSwap={onRequestSwap}
      />
    );
  }
  
  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Shift Selected</h3>
        <p className="text-muted-foreground">
          Select a shift from the calendar to view details or request a swap.
        </p>
      </CardContent>
    </Card>
  );
};

export default CalendarSidebar;
