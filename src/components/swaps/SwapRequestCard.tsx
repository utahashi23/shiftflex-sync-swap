
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ShiftTypeIcon from './ShiftTypeIcon';
import ShiftTypeBadge from './ShiftTypeBadge';
import { SwapRequest, PreferredDate } from '@/hooks/swap-requests/types';

interface SwapRequestCardProps {
  request: SwapRequest;
  onDeleteRequest: (requestId: string) => void;
  onDeletePreferredDate: (dayId: string, requestId: string) => void;
}

const ShiftHeader = ({ shift }: { shift: SwapRequest['originalShift'] }) => {
  return (
    <div className="flex items-center">
      <div className={cn(
        "p-1.5 rounded-md mr-2",
        shift.type === 'day' ? "bg-yellow-100 text-yellow-600" :
        shift.type === 'afternoon' ? "bg-orange-100 text-orange-600" :
        "bg-blue-100 text-blue-600"
      )}>
        <ShiftTypeIcon type={shift.type} />
      </div>
      <div>
        {shift.title || `Shift-${shift.id.substring(0, 5)}`} ({formatDate(shift.date)})
      </div>
    </div>
  );
};

const OriginalShiftInfo = ({ shift }: { shift: SwapRequest['originalShift'] }) => {
  return (
    <div className="flex justify-between">
      <div className="space-y-1">
        <div className="text-sm font-medium text-muted-foreground">Original Shift</div>
        <div className="font-medium">
          {formatDate(shift.date)}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-muted-foreground">Shift Type</div>
        <ShiftTypeBadge type={shift.type} />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-muted-foreground">Time</div>
        <div className="font-medium">{shift.startTime} - {shift.endTime}</div>
      </div>
    </div>
  );
};

const PreferredDateItem = ({ 
  preferredDay,
  requestId,
  canDelete, 
  onDelete 
}: { 
  preferredDay: PreferredDate;
  requestId: string;
  canDelete: boolean;
  onDelete: () => void;
}) => {
  // Check if acceptedTypes exists and is an array before using map
  const acceptedTypes = preferredDay.acceptedTypes || [];
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-md bg-secondary/20">
      <div>
        <div className="font-medium">{formatDate(preferredDay.date)}</div>
        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-1">
          {acceptedTypes.map(type => (
            <ShiftTypeBadge key={type} type={type} size="sm" />
          ))}
        </div>
      </div>
      
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

const PreferredDatesSection = ({ 
  request,
  onDeletePreferredDate 
}: { 
  request: SwapRequest;
  onDeletePreferredDate: (dayId: string, requestId: string) => void;
}) => {
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground mb-2">Preferred Swap Dates</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
        {request.preferredDates.map((preferredDay) => (
          <PreferredDateItem 
            key={preferredDay.id}
            preferredDay={preferredDay}
            requestId={request.id}
            canDelete={request.preferredDates.length > 1}
            onDelete={() => onDeletePreferredDate(preferredDay.id, request.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Format date to user-friendly string
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const SwapRequestCard = ({ request, onDeleteRequest, onDeletePreferredDate }: SwapRequestCardProps) => {
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
          <ShiftHeader shift={request.originalShift} />
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <OriginalShiftInfo shift={request.originalShift} />
          <PreferredDatesSection 
            request={request}
            onDeletePreferredDate={onDeletePreferredDate}
          />
        </div>
      </CardContent>

      <CardFooter className="bg-secondary/20 border-t px-6">
        <div className="flex justify-between items-center w-full py-2">
          <div className="text-sm">Status:</div>
          {request.acceptedByOthers ? (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              Accepted by other users
            </div>
          ) : (
            <div className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              Pending
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default SwapRequestCard;
