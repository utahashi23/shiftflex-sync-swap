
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { SwapMatch } from "../types";
import { ShiftDetailsDialog } from "../ShiftDetailsDialog";

interface SwapCardFooterProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
  onCancel?: (matchId: string) => void;
}

export const SwapCardFooter = ({ 
  swap, 
  isPast = false,
  onAccept, 
  onFinalize, 
  onCancel 
}: SwapCardFooterProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  if (isPast) {
    return null;
  }

  return (
    <>
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
              
              <Button 
                onClick={() => setDetailsOpen(true)}
                variant="outline"
                className="flex items-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                Shift Details
              </Button>
              
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
      
      {/* Shift Details Dialog */}
      <ShiftDetailsDialog 
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        swap={detailsOpen ? swap : null}
      />
    </>
  );
};
