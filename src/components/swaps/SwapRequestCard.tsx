
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrashIcon, Truck, Clock } from "lucide-react";
import ShiftTypeBadge from './ShiftTypeBadge';
import { getShiftType } from '@/utils/shiftUtils';

interface SwapRequestCardProps {
  request: any;
  onDelete: () => void;
  onDeletePreferredDate?: (dayId: string, requestId: string) => void;
}

const SwapRequestCard = ({ request, onDelete, onDeletePreferredDate }: SwapRequestCardProps) => {
  // Debug log to see the request structure
  console.log("Rendering SwapRequestCard with request:", request);
  
  // Check if we have a shifts object from the join
  const shift = request.shifts;
  
  // Format the shift date if available
  const shiftDate = shift?.date 
    ? format(new Date(shift.date), 'dd MMM yyyy')
    : 'Unknown date';
    
  // Get the truck name or leave it empty
  const truckName = shift?.truck_name || '';
  
  // Get wanted date from the request itself
  const wantedDateStr = request.wanted_date || 'Unknown date';
  const wantedDate = wantedDateStr !== 'Unknown date' 
    ? format(new Date(wantedDateStr), 'dd MMM yyyy')
    : wantedDateStr;
  
  // Determine shift type based on start time using the utility function
  let shiftType = shift?.start_time
    ? getShiftType(shift.start_time)
    : 'day'; // Default to day shift if no time available

  // Get accepted shift types
  const acceptedTypes = request.accepted_shift_types || ['day', 'afternoon', 'night'];
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              {truckName || 'Shift'}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{shiftDate}</span>
            </CardDescription>
            {/* Add a more prominent shift type badge with higher visibility */}
            <div className="mt-1.5">
              <ShiftTypeBadge type={shiftType} showLabel={true} />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0">
            <TrashIcon className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="space-y-2">
          <div>
            <h4 className="text-sm font-medium">Requested date:</h4>
            <p className="text-sm">{wantedDate}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium">My shift type:</h4>
            <div className="mt-1">
              <ShiftTypeBadge type={shiftType} />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium">Accepted shift types:</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {acceptedTypes.map((type: string) => (
                <ShiftTypeBadge key={type} type={type} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1">
        <p className="text-xs text-muted-foreground">
          Status: <span className="capitalize">{request.status}</span>
        </p>
      </CardFooter>
    </Card>
  );
};

export default SwapRequestCard;
