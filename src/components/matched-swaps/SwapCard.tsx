
import { ArrowRightLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { SwapMatch } from "./types";
import ShiftDetailCard from "./ShiftDetailCard";
import SwapStatusBadge from "./SwapStatusBadge";
import SwapCardActions from "./SwapCardActions";
import { shouldHideActionButtons } from "./utils/specialUserUtils";

interface SwapCardProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
  isAcceptedByOthers?: boolean;
}

export const SwapCard = ({ 
  swap, 
  isPast = false, 
  onAccept, 
  onFinalize, 
  onResendEmail,
  isAcceptedByOthers = false
}: SwapCardProps) => {
  console.log(`SwapCard rendering for match ${swap.id} with status ${swap.status} and colleague types:`, {
    myShift: swap.myShift.colleagueType,
    otherShift: swap.otherShift.colleagueType,
    isAcceptedByOthers,
    myShiftUserId: swap.myShift.userId,
  });
  
  // Determine if action buttons should be hidden
  const hideActionButtons = shouldHideActionButtons(
    swap.myShift.userId,
    swap.otherShift.userId,
    swap.status,
    isAcceptedByOthers
  );
  
  console.log(`Button visibility for ${swap.id}: hideActionButtons=${hideActionButtons}`);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-secondary/30 pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <ArrowRightLeft className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-medium">Shift Swap</h3>
          </div>
          <SwapStatusBadge status={swap.status} isAcceptedByOthers={isAcceptedByOthers} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Shift */}
          <ShiftDetailCard
            shift={swap.myShift}
            label="Your Shift"
            isPast={isPast}
          />
          
          {/* Their Shift */}
          <ShiftDetailCard
            shift={{
              ...swap.otherShift,
              userName: swap.otherShift.userName
            }}
            label={isPast ? "Completed Swap" : "Matched Shift"}
            isPast={isPast}
          />
        </div>

        {/* Display a notice when the swap has been accepted by others */}
        {isAcceptedByOthers && (
          <div className="mt-4 p-3 border rounded-md bg-blue-50 text-blue-700 text-sm">
            This swap has already been accepted by other users and is awaiting finalization.
          </div>
        )}
      </CardContent>
      
      {/* Only show action buttons if not past swap and not hidden */}
      {!isPast && (
        <CardFooter className="bg-secondary/20 border-t px-4 py-3">
          <SwapCardActions
            status={swap.status}
            onAccept={onAccept}
            onFinalize={onFinalize}
            onResendEmail={onResendEmail}
            matchId={swap.id}
            isPast={isPast}
            hideActionButtons={hideActionButtons}
          />
        </CardFooter>
      )}
    </Card>
  );
};
