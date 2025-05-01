
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchedSwap } from './types';
import { ShiftTypeIcon } from './ShiftTypeIcon';
import { formatDate, getShiftTypeLabel } from './utils';

interface SwapCardProps {
  swap: MatchedSwap;
  isPast?: boolean;
  onAccept?: (swapId: string) => void;
}

export const SwapCard = ({ swap, isPast = false, onAccept }: SwapCardProps) => {
  return (
    <Card key={swap.id} className={isPast ? "opacity-80" : ""}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <div className={cn(
            "p-1.5 rounded-md mr-2",
            swap.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-600" :
            swap.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-600" :
            "bg-blue-100 text-blue-600"
          )}>
            <ShiftTypeIcon type={swap.originalShift.type} />
          </div>
          <div>{isPast ? "Completed Swap" : "Swap Match Found"}</div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            {/* Original/Your Shift */}
            <div className="flex-1 p-4 border rounded-lg bg-secondary/10">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                {isPast ? "Original Shift" : "Your Shift"}
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-medium flex items-center",
                  swap.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                  swap.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                  "bg-blue-100 text-blue-800"
                )}>
                  <ShiftTypeIcon type={swap.originalShift.type} />
                  <span className="ml-1">{getShiftTypeLabel(swap.originalShift.type)}</span>
                </div>
                
                <div className="text-sm font-medium">
                  {swap.originalShift.title}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Date</div>
                  <div>{formatDate(swap.originalShift.date)}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground">Time</div>
                  <div>{swap.originalShift.startTime} - {swap.originalShift.endTime}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground">Colleague</div>
                  <div>{swap.originalShift.colleagueType}</div>
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="flex justify-center">
              <div className="hidden md:flex h-10 w-10 rounded-full bg-secondary items-center justify-center">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
              <div className="md:hidden h-10 w-10 rounded-full bg-secondary flex items-center justify-center transform rotate-90">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            {/* Matched/Swapped Shift */}
            <div className="flex-1 p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                {isPast ? "Swapped Shift" : "Matched Shift"}
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-medium flex items-center",
                  swap.matchedShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                  swap.matchedShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                  "bg-blue-100 text-blue-800"
                )}>
                  <ShiftTypeIcon type={swap.matchedShift.type} />
                  <span className="ml-1">{getShiftTypeLabel(swap.matchedShift.type)}</span>
                </div>
                
                <div className="text-sm font-medium">
                  {swap.matchedShift.title}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Date</div>
                  <div>{formatDate(swap.matchedShift.date)}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground">Time</div>
                  <div>{swap.matchedShift.startTime} - {swap.matchedShift.endTime}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground">Colleague</div>
                  <div>{swap.matchedShift.colleagueType}</div>
                </div>
                
                {!isPast && (
                  <div>
                    <div className="text-muted-foreground">Requested By</div>
                    <div>{swap.matchedShift.colleague}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center">
              <div className={cn(
                "px-2 py-1 text-xs font-medium rounded-full",
                isPast ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              )}>
                {isPast ? "Completed" : "Matched"}
              </div>
            </div>
            
            {isPast ? (
              <div className="text-xs text-muted-foreground">
                This swap will be removed on {formatDate('2025-05-30')}
              </div>
            ) : (
              <Button onClick={() => onAccept && onAccept(swap.id)}>
                Accept Swap
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
