
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowRightLeft, Calendar, Clock, Copy, Eye, Mail, UserCircle2, AlertTriangle } from "lucide-react";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { SwapMatch } from "./types";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface SwapCardProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
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
  onResendEmail 
}: SwapCardProps) => {
  const [isCopied, setIsCopied] = useState(false);
  
  // Debug logging for colleague types and status
  console.log(`SwapCard rendering for match ${swap.id} with status ${swap.status} and colleague types:`, {
    myShift: swap.myShift.colleagueType,
    otherShift: swap.otherShift.colleagueType
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
          text: 'Accepted by Other User',
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

  // Function to generate swap details for copying
  const getSwapDetailsText = () => {
    return `Shift Swap Details:
-------------------
Status: ${statusDisplay.text}

Your Shift:
Date: ${formatDate(swap.myShift.date)}
Time: ${swap.myShift.startTime} - ${swap.myShift.endTime}
Type: ${swap.myShift.type.charAt(0).toUpperCase() + swap.myShift.type.slice(1)}
Location: ${swap.myShift.truckName || 'Not specified'}
Colleague Type: ${swap.myShift.colleagueType || 'Not specified'}

Matched Shift:
Date: ${formatDate(swap.otherShift.date)}
Time: ${swap.otherShift.startTime} - ${swap.otherShift.endTime}
Type: ${swap.otherShift.type.charAt(0).toUpperCase() + swap.otherShift.type.slice(1)}
Location: ${swap.otherShift.truckName || 'Not specified'}
Colleague Type: ${swap.otherShift.colleagueType || 'Not specified'}
Staff Member: ${swap.otherShift.userName || 'Not specified'}

Swap ID: ${swap.id}`;
  };

  const handleCopyDetails = () => {
    navigator.clipboard.writeText(getSwapDetailsText())
      .then(() => {
        setIsCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "Swap details copied to clipboard successfully"
        });
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Copy failed",
          description: "Could not copy to clipboard. Please try again.",
          variant: "destructive"
        });
      });
  };
  
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
        
        {/* Display warning for other_accepted status */}
        {swap.status === 'other_accepted' && (
          <div className="mt-4 p-3 border border-yellow-300 rounded-md bg-yellow-50">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  This shift has already been accepted by another user
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  The shift you were interested in is no longer available as it has been accepted in another swap.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {!isPast && (
        <CardFooter className="bg-secondary/20 border-t px-4 py-3">
          <div className="w-full flex justify-end gap-2">
            {swap.status === 'pending' && onAccept && (
              <Button 
                onClick={() => onAccept(swap.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept Swap
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
            
            {/* Explicitly check for 'accepted' status */}
            {swap.status === 'accepted' && (
              <>
                {/* Removed the Resend Email button as requested */}
                {/* Instead adding a See Swap Details button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline"
                      className="flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      See Swap Details
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Swap Details</h4>
                      <div className="text-xs whitespace-pre-wrap border p-3 rounded-md bg-slate-50">
                        {getSwapDetailsText()}
                      </div>
                      <Button 
                        onClick={handleCopyDetails}
                        className="w-full flex items-center justify-center"
                        variant="secondary"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {isCopied ? "Copied!" : "Copy Details"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Copy these details to manually send via email or your preferred method.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                
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
