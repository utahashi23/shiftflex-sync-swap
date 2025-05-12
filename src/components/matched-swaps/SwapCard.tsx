
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, Calendar, Clock, UserCircle2, AlertTriangle, FileText, Mail, CheckCircle2, Clock3 } from "lucide-react";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { SwapMatch } from "./types";
import { useState } from "react";
import { ShiftDetailsDialog } from "./ShiftDetailsDialog";

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
  
  // Debug logging for colleague types and status
  console.log(`SwapCard rendering for match ${swap.id} with status ${swap.status} and colleague types:`, {
    myShift: swap.myShift.colleagueType,
    otherShift: swap.otherShift.colleagueType,
    hasAccepted: swap.hasAccepted,
    otherHasAccepted: swap.otherHasAccepted
  });
  
  // Determine status display text and color
  const getStatusDisplay = () => {
    switch (swap.status) {
      case 'pending':
        if (swap.hasAccepted && !swap.otherHasAccepted) {
          return {
            text: 'Awaiting Other User',
            colorClass: 'bg-blue-100 text-blue-800'
          };
        }
        return {
          text: 'Pending',
          colorClass: 'bg-amber-100 text-amber-800'
        };
      case 'accepted':
        return {
          text: 'Accepted',
          colorClass: 'bg-green-100 text-green-800'
        };
      case 'other_accepted':
        return {
          text: 'Accepted by Another User',
          colorClass: 'bg-gray-100 text-gray-800'
        };
      case 'completed':
        return {
          text: 'Completed',
          colorClass: 'bg-green-100 text-green-800'
        };
      default:
        return {
          text: swap.status.charAt(0).toUpperCase() + swap.status.slice(1),
          colorClass: 'bg-gray-100 text-gray-800'
        };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  
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
                  {swap.myShift.colleagueType}
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
                  {swap.otherShift.colleagueType}
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
        
        {/* Display notification for partially accepted swap */}
        {swap.status === 'pending' && swap.hasAccepted && !swap.otherHasAccepted && (
          <Alert className="mt-4 border-blue-200 bg-blue-50">
            <Clock3 className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700">
              You've accepted this swap. Waiting for the other user to accept as well.
            </AlertDescription>
          </Alert>
        )}

        {/* Display notification for partially accepted swap - other user has accepted */}
        {swap.status === 'pending' && !swap.hasAccepted && swap.otherHasAccepted && (
          <Alert className="mt-4 border-blue-200 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700">
              The other user has already accepted this swap. Accept to complete the match!
            </AlertDescription>
          </Alert>
        )}
        
        {/* Display warning for other_accepted status */}
        {swap.status === 'other_accepted' && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50" variant="warning">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              This shift has already been accepted by another user. The shift you were interested in is no longer available.
            </AlertDescription>
          </Alert>
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
          
            {/* Show Accept button if pending and user hasn't accepted yet */}
            {swap.status === 'pending' && !swap.hasAccepted && onAccept && (
              <Button 
                onClick={() => onAccept(swap.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept Swap
              </Button>
            )}
            
            {/* Show waiting message if user has accepted but other user hasn't */}
            {swap.status === 'pending' && swap.hasAccepted && !swap.otherHasAccepted && (
              <Button 
                disabled
                className="opacity-70 cursor-not-allowed flex items-center"
              >
                <Clock3 className="h-4 w-4 mr-2" />
                Waiting...
              </Button>
            )}
            
            {swap.status === 'other_accepted' && (
              <Button 
                disabled
                variant="outline"
                className="opacity-50 cursor-not-allowed"
              >
                Already Accepted
              </Button>
            )}
            
            {/* Explicitly check for 'accepted' status - this means both users have accepted */}
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
