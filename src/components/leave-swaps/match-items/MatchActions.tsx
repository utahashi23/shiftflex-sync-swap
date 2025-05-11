
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Check, X } from 'lucide-react';
import { LeaveSwapMatch } from '@/types/leave-blocks';

interface MatchActionsProps {
  match: LeaveSwapMatch;
  onViewDetails: () => void;
  onAccept?: () => void;
  onFinalize?: () => void;
  onCancel?: () => void;
  isAccepting?: boolean;
  isFinalizing?: boolean;
  isCancelling?: boolean;
}

const MatchActions: React.FC<MatchActionsProps> = ({
  match,
  onViewDetails,
  onAccept,
  onFinalize,
  onCancel,
  isAccepting = false,
  isFinalizing = false,
  isCancelling = false
}) => {
  return (
    <div className="flex space-x-2">
      {/* Swap Details Button - Always shown */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={onViewDetails}
        className="flex items-center gap-1"
      >
        <FileText className="h-4 w-4 mr-1" />
        Swap Details
      </Button>
      
      {/* Accept Button - Only shown for pending matches */}
      {match.match_status === 'pending' && onAccept && (
        <Button 
          variant="default"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700" 
          onClick={onAccept}
          disabled={isAccepting}
        >
          <Check className="h-4 w-4 mr-1" />
          {isAccepting ? 'Accepting...' : 'Accept'}
        </Button>
      )}
      
      {/* Finalize Button - Only shown for accepted matches */}
      {match.match_status === 'accepted' && onFinalize && (
        <Button 
          variant="default" 
          size="sm"
          onClick={onFinalize}
          disabled={isFinalizing}
        >
          <Check className="h-4 w-4 mr-1" />
          {isFinalizing ? 'Finalizing...' : 'Finalize'}
        </Button>
      )}
      
      {/* Cancel Button - Shown for all active matches */}
      {match.match_status !== 'completed' && match.match_status !== 'cancelled' && onCancel && (
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onCancel}
          disabled={isCancelling}
          className="hover:bg-red-100 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default MatchActions;
