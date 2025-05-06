
import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Trash2, AlertCircle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SwapRequest } from '@/hooks/swap-requests/types';
import { format } from 'date-fns';
import ShiftTypeBadge from './ShiftTypeBadge';

interface SwapRequestCardProps {
  request: SwapRequest;
  onDeleteRequest: (requestId: string) => void;
  onDeletePreferredDate: (dayId: string, requestId: string) => void;
  isCompleted?: boolean;
}

const SwapRequestCard: React.FC<SwapRequestCardProps> = ({
  request,
  onDeleteRequest,
  onDeletePreferredDate,
  isCompleted = false
}) => {
  const { originalShift, preferredDates } = request;
  const originalDate = new Date(originalShift.date);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {originalShift.title}
              {isCompleted ? (
                <Badge className="ml-2 bg-green-600">Completed</Badge>
              ) : (
                <Badge className="ml-2">Pending</Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center mt-1">
              <CalendarDays className="mr-1 h-4 w-4" />
              <span>{format(originalDate, 'EEEE, MMMM d, yyyy')}</span>
            </CardDescription>
          </div>
          
          {!isCompleted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteRequest(request.id)}
              aria-label="Delete swap request"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Original Shift</h4>
            <div className="flex items-center justify-between bg-muted p-3 rounded-md">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{originalShift.startTime} - {originalShift.endTime}</span>
              </div>
              <ShiftTypeBadge type={originalShift.type} />
            </div>
          </div>
          
          {!isCompleted && preferredDates.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Preferred Alternative Dates
              </h4>
              <div className="space-y-2">
                {preferredDates.map((date) => (
                  <div 
                    key={date.id} 
                    className="flex items-center justify-between bg-muted p-3 rounded-md"
                  >
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{format(new Date(date.date), 'EEEE, MMMM d')}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex gap-1 mr-3">
                        {date.acceptedTypes.map((type) => (
                          <ShiftTypeBadge key={type} type={type} small />
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onDeletePreferredDate(date.id, request.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isCompleted && (
            <div className="mt-4 bg-green-50 p-3 rounded-md border border-green-200">
              <div className="flex items-center">
                <Check className="h-5 w-5 mr-2 text-green-600" />
                <span className="text-green-800 font-medium">Swap completed successfully</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                This swap request has been completed and the shift has been exchanged.
              </p>
            </div>
          )}
          
          {preferredDates.length === 0 && !isCompleted && (
            <div className="flex items-center p-3 rounded-md bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
              <span className="text-sm text-amber-700">
                No preferred dates added. Add preferred dates to increase match chances.
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className={`bg-muted/30 p-3 text-xs text-muted-foreground ${isCompleted ? 'justify-center' : 'justify-between'}`}>
        {isCompleted ? (
          <div className="flex items-center">
            <span>Request ID: {request.id.substring(0, 8)}...</span>
          </div>
        ) : (
          <>
            <div>Request ID: {request.id.substring(0, 8)}...</div>
            <div>{preferredDates.length} preferred date(s)</div>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default SwapRequestCard;
