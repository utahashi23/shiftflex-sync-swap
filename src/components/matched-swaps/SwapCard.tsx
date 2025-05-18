
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ArrowRightLeft, Calendar, Clock, UserCircle2, AlertTriangle, FileText, Mail } from "lucide-react";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { SwapMatch } from "./types";
import { useState } from "react";
import { ShiftDetailsDialog } from "./ShiftDetailsDialog";
import { useAuth } from "@/hooks/useAuth";

interface SwapCardProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
  onCancel?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
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
  onCancel,
  onResendEmail
}: SwapCardProps) => {
  // Dialog state for shift details
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { user } = useAuth();
  
  // Debug logging for colleague types and status
  console.log(`SwapCard rendering for match ${swap.id} with status ${swap.status} and colleague types:`, {
    myShift: swap.myShift.colleagueType,
    otherShift: swap.otherShift.colleagueType,
    currentUserId: user?.id,
    status: swap.status
  });
  
  // Determine status display text and color
  const getStatusDisplay = () => {
    switch (swap.status) {
      case 'pending':
        return {
          text: 'Pending',
          colorClass: 'bg-amber-100 text-amber-800'
        };
      case 'accepted':
        return {
          text: 'Accepted',
          colorClass: 'bg-blue-100 text-blue-800'
        };
      case 'other_accepted':
        return {
          text: 'Partially Accepted',
          colorClass: 'bg-yellow-100 text-yellow-800'
        };
      case 'completed':
        return {
          text: 'Completed',
          colorClass: 'bg-green-100 text-green-800'
        };
      default:
        // Fix the type error by ensuring we're working with a string
        const status = swap.status as string;
        return {
          text: status.charAt(0).toUpperCase() + status.slice(1),
          colorClass: 'bg-gray-100 text-gray-800'
        };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  
  // Determine if the current user can accept this swap
  const canAcceptSwap = swap.status === 'pending' || swap.status === 'other_accepted';

  // Check if current user has already accepted this swap
  // We need to determine if this is showing "Waiting for other user" or "You can accept"
  const hasCurrentUserAccepted = swap.status === 'other_accepted' && 
    ((swap.acceptorHasAccepted && user?.id === swap.otherShift.userId) ||
     (swap.requesterHasAccepted && user?.id !== swap.otherShift.userId));
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-secondary/30 pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <ArrowRightLeft className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-medium">Shift Swap</h3>
          </div>
          <div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusDisplay.colorClass}`}>
              {statusDisplay.text}
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
                  {swap.myShift.colleagueType || ""}
                </span>
              </div>

              {swap.myShift.employeeId && (
                <div className="flex items-center mt-1">
                  <span className="h-4 w-4 mr-2 text-muted-foreground">🪪</span>
                  <span className="text-sm" data-testid="my-employee-id">
                    Service#: {swap.myShift.employeeId}
                  </span>
                </div>
              )}
              
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
                  {swap.otherShift.colleagueType || ""}
                </span>
              </div>

              {swap.otherShift.employeeId && (
                <div className="flex items-center mt-1">
                  <span className="h-4 w-4 mr-2 text-muted-foreground">🪪</span>
                  <span className="text-sm" data-testid="other-employee-id">
                    Service#: {swap.otherShift.employeeId}
                  </span>
                </div>
              )}
              
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {swap.otherShift.truckName || 'Shift'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Display personalized notification message based on the status */}
        {swap.status === 'other_accepted' && (
          <div className="mt-4 p-3 border rounded-md bg-yellow-50">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
              <div>
                {hasCurrentUserAccepted ? (
                  <>
                    <p className="text-sm font-medium text-yellow-800">
                      Waiting for other user to accept
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      You have accepted this swap. Once the other user accepts, you'll be able to finalize it.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-yellow-800">
                      This shift swap has been partially accepted
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      The other user has already accepted this swap. You can now accept it to complete the swap process.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* For fully accepted but not finalized swaps */}
        {swap.status === 'accepted' && (
          <div className="mt-4 p-3 border border-blue-300 rounded-md bg-blue-50">
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Ready to finalize this shift swap
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Both users have accepted this swap. Please confirm your swap through UKG or email rosters, 
                  then click "Finalize Swap" when this has been confirmed.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {!isPast && (
        <CardFooter className="bg-secondary/20 border-t px-4 py-3">
          <div className="w-full flex justify-end gap-2">
            <Button 
              onClick={() => setDetailsOpen(true)}
              variant="outline"
              className="flex items-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              Swap Details
            </Button>
          
            {/* Show Accept button for pending or other_accepted status, but only if user hasn't already accepted */}
            {canAcceptSwap && !hasCurrentUserAccepted && onAccept && (
              <Button 
                onClick={() => onAccept(swap.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept Swap
              </Button>
            )}
            
            {/* Explicitly check for 'accepted' status */}
            {swap.status === 'accepted' && (
              <>
                {onCancel && (
                  <Button 
                    onClick={() => onCancel(swap.id)}
                    variant="outline"
                    className="hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                )}

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
      
      {/* Shift Details Dialog */}
      <ShiftDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        swap={swap}
      />
    </Card>
  );
};
