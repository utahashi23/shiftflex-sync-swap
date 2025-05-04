
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ArrowRightLeft, Calendar, Clock } from "lucide-react";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { SwapMatch } from "@/hooks/useSwapMatches";

interface SwapCardProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
}

// Format date to a readable string
const formatDate = (dateStr: string) => {
  try {
    if (!dateStr) return 'Unknown date';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    console.error('Error formatting date:', dateStr, e);
    return dateStr || 'Unknown date';
  }
};

export const SwapCard = ({ swap, isPast = false, onAccept }: SwapCardProps) => {
  // Add debugging to help identify issues
  console.log('Rendering SwapCard with data:', swap);
  
  // Ensure swap object and required properties exist
  if (!swap) {
    console.error('Missing swap data in SwapCard');
    return null;
  }

  // More defensive checks to ensure the UI doesn't break
  const myShift = swap.myShift || {};
  const otherShift = swap.otherShift || {};

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-secondary/30 pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <ArrowRightLeft className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-medium">Shift Swap</h3>
          </div>
          <div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              swap.status === 'pending' ? 'bg-amber-100 text-amber-800' :
              swap.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Shift */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Your Shift</h4>
            
            <div className="p-3 border rounded-md bg-background">
              <div className="flex items-center justify-between">
                <ShiftTypeBadge type={myShift.type || 'unknown'} />
              </div>
              
              <div className="flex items-center mt-2">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{formatDate(myShift.date || '')}</span>
              </div>
              
              <div className="flex items-center mt-1">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{myShift.startTime || '00:00'} - {myShift.endTime || '00:00'}</span>
              </div>
              
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {myShift.truckName || 'Unknown location'}
              </div>
            </div>
          </div>
          
          {/* Their Shift */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              {isPast ? 'Completed Swap' : 'Matched Shift'}
            </h4>
            
            <div className="p-3 border rounded-md bg-background">
              <div className="flex items-center justify-between">
                <ShiftTypeBadge type={otherShift.type || 'unknown'} />
                <div className="text-xs font-medium text-muted-foreground">
                  {otherShift.userName || 'Unknown User'}
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{formatDate(otherShift.date || '')}</span>
              </div>
              
              <div className="flex items-center mt-1">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{otherShift.startTime || '00:00'} - {otherShift.endTime || '00:00'}</span>
              </div>
              
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {otherShift.truckName || 'Unknown location'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      {!isPast && swap.status === 'pending' && onAccept && (
        <CardFooter className="bg-secondary/20 border-t px-4 py-3">
          <div className="w-full flex justify-end">
            <Button 
              onClick={() => onAccept(swap.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept Swap
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
