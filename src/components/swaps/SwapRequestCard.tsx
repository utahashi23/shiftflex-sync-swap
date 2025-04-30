
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { SwapRequest } from '@/types/swapTypes';
import { formatDate, getStatusBadgeColor } from '@/utils/swapUtils';
import OriginalShift from './OriginalShift';
import AcceptableShifts from './AcceptableShifts';

interface SwapRequestCardProps {
  swap: SwapRequest;
  onCancel: (swapId: string) => void;
  isCancelling: boolean;
}

const SwapRequestCard = ({ swap, onCancel, isCancelling }: SwapRequestCardProps) => {
  return (
    <Card key={swap.id} className="overflow-hidden">
      <div className="bg-muted/20 px-6 py-4 flex justify-between items-center border-b">
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className={getStatusBadgeColor(swap.status)}>
            {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
          </Badge>
          <div className="text-sm text-muted-foreground">
            Requested on {formatDate(swap.requestDate)}
          </div>
        </div>
        {swap.status === 'pending' && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onCancel(swap.id)}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4 mr-1" />
            )}
            Cancel
          </Button>
        )}
      </div>
      
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <OriginalShift shift={swap.requesterShift} />
          <AcceptableShifts 
            types={swap.acceptableShifts.types} 
            dates={swap.acceptableShifts.dates} 
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SwapRequestCard;
