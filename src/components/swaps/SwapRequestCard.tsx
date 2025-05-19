import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrashIcon, Truck, Clock, ChevronDown, ChevronUp } from "lucide-react";
import ShiftIconBadge from './ShiftIconBadge';
import { getShiftType } from '@/utils/shiftUtils';
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface SwapRequestCardProps {
  request?: any;
  groupedRequests?: any[];
  onDelete: (requestId: string) => void;
  onDeletePreferredDate?: (dayId: string, requestId: string) => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const SwapRequestCard = ({ 
  request, 
  groupedRequests,
  onDelete, 
  onDeletePreferredDate,
  showCheckbox = false,
  isSelected = false,
  onToggleSelect
}: SwapRequestCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Determine if we're working with a single request or grouped requests
  const isGrouped = !!groupedRequests && groupedRequests.length > 0;
  
  // If grouped requests are provided, use the first one for common details
  // Otherwise fall back to the single request
  const mainRequest = isGrouped ? groupedRequests![0] : request;
  
  // Debug log to see the request structure
  console.log("Rendering SwapRequestCard with data:", isGrouped ? "grouped" : "single", 
    isGrouped ? groupedRequests : request);
  
  // Check if we have a valid request object
  if (!mainRequest) {
    console.error("No valid request data provided to SwapRequestCard");
    return null;
  }
  
  // Check if we have a shifts object from the join
  const shift = mainRequest.shifts;
  
  // If no shift data is available, display an error
  if (!shift) {
    console.error("No shift data available in request:", mainRequest);
    return null;
  }
  
  // Format the shift date if available
  const shiftDate = shift.date 
    ? format(new Date(shift.date), 'dd MMM yyyy')
    : 'Unknown date';
    
  // Get the truck name or leave it empty
  const truckName = shift.truck_name || '';
  
  // Determine shift type based on start time using the utility function
  let shiftType = shift.start_time
    ? getShiftType(shift.start_time)
    : 'day'; // Default to day shift if no time available
  
  // Get all wanted dates
  const getWantedDates = () => {
    if (isGrouped) {
      // Collect all wanted dates from each request
      const allDates: { date: string, requestId: string, id?: string }[] = [];
      
      groupedRequests!.forEach(req => {
        // For improved_shift_swaps, the wanted_date is directly in the request
        if (req.wanted_date) {
          allDates.push({
            date: req.wanted_date,
            requestId: req.id,
            id: req.id // Using request ID as the "day ID" for deletion
          });
        }
      });
      
      return allDates;
    } else {
      // For a single request, just return its wanted date
      if (request.wanted_date) {
        return [{
          date: request.wanted_date,
          requestId: request.id,
          id: request.id
        }];
      }
    }
    
    return [];
  };
  
  const wantedDates = getWantedDates();
  
  // Filter out duplicate dates (to avoid showing the same date multiple times)
  const uniqueWantedDates = wantedDates.filter((date, index, self) => {
    return index === self.findIndex(d => d.date === date.date);
  });
  
  // Format dates for display
  const formattedWantedDates = uniqueWantedDates.map(item => {
    const dateStr = item.date || 'Unknown date';
    return {
      ...item,
      formattedDate: dateStr !== 'Unknown date' 
        ? format(new Date(dateStr), 'dd MMM yyyy')
        : dateStr
    };
  });
  
  // Get accepted shift types
  const acceptedTypes = mainRequest.accepted_shift_types || ['day', 'afternoon', 'night'];
  
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
              <span className="text-[0.85rem]">{shiftDate}</span>
            </CardDescription>
          </div>
          <div className="flex items-center">
            {showCheckbox && (
              <Checkbox 
                id={`select-${mainRequest.id}`}
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                className="mr-2 border-black"
              />
            )}
            <Button variant="ghost" size="sm" onClick={() => onDelete(mainRequest.id)} className="h-8 w-8 p-0">
              <TrashIcon className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="space-y-2">
          {isGrouped && (
            <div className="mb-1">
              <Badge variant="secondary">
                {groupedRequests!.length} request{groupedRequests!.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
          
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
            <div>
              <h4 className="text-sm font-medium flex items-center justify-between">
                Requested dates:
                {formattedWantedDates.length > 3 && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
                      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <span className="sr-only">{isOpen ? "Hide" : "Show"} all dates</span>
                    </Button>
                  </CollapsibleTrigger>
                )}
              </h4>
              
              {/* Always show first 3 dates */}
              <div className="mt-1 space-y-1">
                {formattedWantedDates.slice(0, 3).map((item, index) => (
                  <div key={`${item.requestId}-${item.date}-${index}`} className="flex items-center justify-between">
                    <span className="text-sm text-[0.85rem]">{item.formattedDate}</span>
                    {onDeletePreferredDate && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0" 
                        onClick={() => onDeletePreferredDate(item.id || "", item.requestId)}
                      >
                        <TrashIcon className="h-3 w-3" />
                        <span className="sr-only">Delete date</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Show remaining dates only when expanded */}
              {formattedWantedDates.length > 3 && (
                <CollapsibleContent>
                  <div className="mt-1 space-y-1">
                    {formattedWantedDates.slice(3).map((item, index) => (
                      <div key={`${item.requestId}-${item.date}-${index}`} className="flex items-center justify-between">
                        <span className="text-sm text-[0.85rem]">{item.formattedDate}</span>
                        {onDeletePreferredDate && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0" 
                            onClick={() => onDeletePreferredDate(item.id || "", item.requestId)}
                          >
                            <TrashIcon className="h-3 w-3" />
                            <span className="sr-only">Delete date</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              )}
            </div>
          </Collapsible>
          
          <div>
            <h4 className="text-sm font-medium">My shift type:</h4>
            <div className="mt-1">
              <ShiftIconBadge type={shiftType} showLabel={true} />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium">Accepted shift types:</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {acceptedTypes.map((type: string) => (
                <ShiftIconBadge key={type} type={type} showLabel={true} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1">
        <p className="text-xs text-muted-foreground">
          Status: <span className="capitalize">{mainRequest.status}</span>
        </p>
      </CardFooter>
    </Card>
  );
};

export default SwapRequestCard;
