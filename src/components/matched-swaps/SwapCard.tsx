
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, Calendar, Clock, UserCircle2, AlertTriangle, FileText, Mail, Loader2, Check } from "lucide-react";
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
    otherShift: swap.otherShift.colleagueType
  });
  
  // Determine if this user has accepted the swap
  const iAccepted = swap.status === 'accepted' && swap.requesterId === user?.id;
  const otherAccepted = swap.status === 'other_accepted';
  const bothAccepted = swap.status === 'dual_accepted';
  
  // Determine status display text and color
  const getStatusDisplay = () => {
    switch (swap.status) {
      case 'pending':
        return {
          text: 'Pending',
          colorClass: 'bg-amber-100 text-amber-800'
        };
      case 'accepted':
        return iAccepted ? {
          text: 'You Accepted - Waiting for Other User',
          colorClass: 'bg-blue-100 text-blue-800'
        } : {
          text: 'Other User Accepted - Waiting for You',
          colorClass: 'bg-blue-100 text-blue-800'
        };
      case 'other_accepted':
        return {
          text: 'Other User Accepted',
          colorClass: 'bg-gray-100 text-gray-800'
        };
      case 'dual_accepted':
        return {
          text: 'Both Accepted - Ready to Finalize',
          colorClass: 'bg-green-100 text-green-800'
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
        
        {/* Display acceptance status information */}
        {(iAccepted) && (
          <Alert className="mt-4 bg-blue-50 border border-blue-200">
            <Check className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              You have accepted this swap. Waiting for the other user to accept.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Display warning for other_accepted status */}
        {(swap.status === 'other_accepted') && (
          <div className="mt-4 p-3 border border-yellow-300 rounded-md bg-yellow-50">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  The other user has already accepted this swap
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Please accept this swap to proceed with the exchange.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Display dual acceptance information */}
        {(bothAccepted) && (
          <Alert className="mt-4 bg-green-50 border border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Both users have accepted this swap. Ready to finalize.
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
          
            {/* Show accept button if swap is pending or other_accepted */}
            {(swap.status === 'pending' || swap.status === 'other_accepted') && onAccept && (
              <Button 
                onClick={() => onAccept(swap.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept Swap
              </Button>
            )}
            
            {/* Show waiting button if user has accepted but waiting for other user */}
            {(iAccepted) && (
              <Button 
                disabled
                className="flex items-center bg-blue-600 hover:bg-blue-600 cursor-not-allowed"
              >
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Waiting for Other User
              </Button>
            )}
            
            {/* Show cancel option for accepted swaps */}
            {(swap.status === 'accepted' || swap.status === 'other_accepted' || swap.status === 'dual_accepted') && onCancel && (
              <Button 
                onClick={() => onCancel(swap.id)}
                variant="outline"
                className="hover:bg-red-50"
              >
                Cancel
              </Button>
            )}

            {/* Show email resend option for accepted swaps */}
            {(swap.status === 'accepted' || swap.status === 'dual_accepted') && onResendEmail && (
              <Button 
                onClick={() => onResendEmail(swap.id)}
                variant="outline"
                className="flex items-center"
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Email
              </Button>
            )}
            
            {/* Show finalize button only when both users have accepted */}
            {bothAccepted && onFinalize && (
              <Button 
                onClick={() => onFinalize(swap.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Finalize Swap
              </Button>
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
