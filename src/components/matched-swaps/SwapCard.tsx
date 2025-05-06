
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ArrowRightLeft, Calendar, Clock, Mail, UserCircle2 } from "lucide-react";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { SwapMatch } from "./types";

interface SwapCardProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
  allMatches?: SwapMatch[]; // Add allMatches prop to check for conflicts
}

// Format date to a readable string
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const SwapCard = ({ 
  swap, 
  isPast = false, 
  onAccept, 
  onFinalize, 
  onResendEmail,
  allMatches = []
}: SwapCardProps) => {
  // Debug logging for colleague types and status
  console.log(`SwapCard rendering for match ${swap.id} with status ${swap.status} and colleague types:`, {
    myShift: swap.myShift.colleagueType,
    otherShift: swap.otherShift.colleagueType
  });
  
  // Check if this swap is already accepted
  const isAccepted = swap.status === 'accepted';
  
  // Check if any other swaps involving the same shift IDs are already accepted
  const isShiftInvolvedInAcceptedSwap = allMatches.some(match => 
    match.status === 'accepted' && 
    (match.myShift.id === swap.myShift.id || 
     match.otherShift.id === swap.myShift.id ||
     match.myShift.id === swap.otherShift.id || 
     match.otherShift.id === swap.otherShift.id)
  );

  // Check if any swap with the same request IDs is already accepted
  const isRequestInvolvedInAcceptedSwap = allMatches.some(match => 
    match.status === 'accepted' && 
    (match.myRequestId === swap.myRequestId ||
     match.otherRequestId === swap.myRequestId ||
     match.myRequestId === swap.otherRequestId ||
     match.otherRequestId === swap.otherRequestId)
  );
  
  // Combined flag for any conflict
  const isConflicting = Boolean(swap.isConflictingWithAccepted) || 
    isShiftInvolvedInAcceptedSwap || 
    isRequestInvolvedInAcceptedSwap;
  
  // If the swap itself is not accepted but conflicts with an accepted swap,
  // we'll display it as effectively conflicting
  const effectiveStatus = isAccepted ? 'accepted' : 
                          isConflicting ? 'conflicting' : 
                          swap.status;
  
  // Should we show the Accept button? Only if:
  // - Swap is pending (not accepted)
  // - Not conflicting with an accepted swap
  // - The onAccept handler exists
  const showAcceptButton = 
    swap.status === 'pending' && 
    !isConflicting &&
    onAccept !== undefined;
  
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
              effectiveStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
              effectiveStatus === 'accepted' ? 'bg-blue-100 text-blue-800' :
              effectiveStatus === 'conflicting' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800'
            }`}>
              {effectiveStatus === 'conflicting' ? 'Already Accepted by Others' : 
               effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
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
                <ShiftTypeBadge type={swap.myShift.type} />
              </div>
              
              <div className="flex items-center mt-2">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{formatDate(swap.myShift.date)}</span>
              </div>
              
              <div className="flex items-center mt-1">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{swap.myShift.startTime} - {swap.myShift.endTime}</span>
              </div>
              
              <div className="flex items-center mt-1">
                <UserCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm" data-testid="my-colleague-type">
                  {swap.myShift.colleagueType}
                </span>
              </div>
              
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {swap.myShift.truckName || 'Shift'}
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
                <ShiftTypeBadge type={swap.otherShift.type} />
                <div className="text-xs font-medium text-muted-foreground">
                  {swap.otherShift.userName}
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{formatDate(swap.otherShift.date)}</span>
              </div>
              
              <div className="flex items-center mt-1">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{swap.otherShift.startTime} - {swap.otherShift.endTime}</span>
              </div>
              
              <div className="flex items-center mt-1">
                <UserCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm" data-testid="other-colleague-type">
                  {swap.otherShift.colleagueType}
                </span>
              </div>
              
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {swap.otherShift.truckName || 'Shift'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      {!isPast && (
        <CardFooter className="bg-secondary/20 border-t px-4 py-3">
          <div className="w-full flex justify-end gap-2">
            {/* Show message if the swap is conflicting */}
            {isConflicting && swap.status === 'pending' && (
              <div className="text-sm text-orange-600 pr-4 self-center">
                This swap conflicts with another swap that has already been accepted.
              </div>
            )}

            {/* Only show Accept Swap button if conditions are met */}
            {showAcceptButton && (
              <Button 
                onClick={() => onAccept(swap.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept Swap
              </Button>
            )}
            
            {/* Explicitly check for 'accepted' status */}
            {isAccepted && (
              <>
                {onResendEmail && (
                  <Button 
                    onClick={() => onResendEmail(swap.id)}
                    variant="outline"
                    className="flex items-center"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Email
                  </Button>
                )}
                
                {onFinalize && (
                  <Button 
                    onClick={() => onFinalize(swap.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Finalize Swap
                  </Button>
                )}
              </>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
