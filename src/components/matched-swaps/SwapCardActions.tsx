
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface SwapCardActionsProps {
  status: string;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
  matchId: string;
  isPast?: boolean;
  hideActionButtons: boolean;
}

const SwapCardActions = ({
  status,
  onAccept,
  onFinalize,
  onResendEmail,
  matchId,
  isPast = false,
  hideActionButtons
}: SwapCardActionsProps) => {
  // If it's a past swap or buttons should be hidden, return null
  if (isPast || hideActionButtons) {
    return null;
  }
  
  return (
    <div className="w-full flex justify-end gap-2">
      {/* Only show accept button for pending swaps */}
      {onAccept && status === 'pending' && (
        <Button 
          onClick={() => onAccept(matchId)}
          className="bg-green-600 hover:bg-green-700"
        >
          Accept Swap
        </Button>
      )}
      
      {/* Only show buttons if the swap is accepted */}
      {status === 'accepted' && (
        <>
          {onResendEmail && (
            <Button 
              onClick={() => onResendEmail(matchId)}
              variant="outline"
              className="flex items-center"
            >
              <Mail className="h-4 w-4 mr-2" />
              Resend Email
            </Button>
          )}
          
          {onFinalize && (
            <Button 
              onClick={() => onFinalize(matchId)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Finalize Swap
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default SwapCardActions;
