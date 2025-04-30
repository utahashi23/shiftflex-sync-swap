
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, Sunrise, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for swap requests
export interface ShiftDetails {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
}

export interface PreferredDate {
  date: string;
  acceptedTypes: string[];
}

export interface SwapRequest {
  id: string;
  originalShift: ShiftDetails;
  preferredDates: PreferredDate[];
  status: string;
}

interface SwapRequestCardProps {
  request: SwapRequest;
  onDeleteRequest: (requestId: string) => void;
  onDeletePreferredDate: (requestId: string, dateStr: string) => void;
}

const SwapRequestCard = ({ request, onDeleteRequest, onDeletePreferredDate }: SwapRequestCardProps) => {
  // Format date to user-friendly string
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get shift type label
  const getShiftTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Get shift icon based on type
  const getShiftIcon = (type: string) => {
    switch(type) {
      case 'day':
        return <Sunrise className="h-4 w-4" />;
      case 'afternoon':
        return <Sun className="h-4 w-4" />;
      case 'night':
        return <Moon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 h-8 w-8 text-gray-500 hover:text-red-600"
        onClick={() => onDeleteRequest(request.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <CardHeader>
        <CardTitle className="text-lg">
          <div className="flex items-center">
            <div className={cn(
              "p-1.5 rounded-md mr-2",
              request.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-600" :
              request.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-600" :
              "bg-blue-100 text-blue-600"
            )}>
              {getShiftIcon(request.originalShift.type)}
            </div>
            <div>
              {request.originalShift.title} ({formatDate(request.originalShift.date)})
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Original Shift</div>
              <div className="font-medium">
                {formatDate(request.originalShift.date)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Shift Type</div>
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-medium inline-flex items-center",
                request.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                request.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                "bg-blue-100 text-blue-800"
              )}>
                {getShiftIcon(request.originalShift.type)}
                <span className="ml-1">{getShiftTypeLabel(request.originalShift.type)} Shift</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Time</div>
              <div className="font-medium">{request.originalShift.startTime} - {request.originalShift.endTime}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Preferred Swap Dates</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
              {request.preferredDates.map((preferredDate, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 border rounded-md bg-secondary/20"
                >
                  <div>
                    <div className="font-medium">{formatDate(preferredDate.date)}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-1">
                      {preferredDate.acceptedTypes.map(type => (
                        <span
                          key={type}
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs",
                            type === 'day' ? "bg-yellow-100 text-yellow-800" :
                            type === 'afternoon' ? "bg-orange-100 text-orange-800" :
                            "bg-blue-100 text-blue-800"
                          )}
                        >
                          {getShiftTypeLabel(type)}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {request.preferredDates.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-600"
                      onClick={() => onDeletePreferredDate(request.id, preferredDate.date)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-secondary/20 border-t px-6">
        <div className="flex justify-between items-center w-full py-2">
          <div className="text-sm">Status:</div>
          <div className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            Pending
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SwapRequestCard;
