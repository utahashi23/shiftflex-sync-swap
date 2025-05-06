
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SwapConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const SwapConfirmDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  isLoading 
}: SwapConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Shift Swap</DialogTitle>
          <DialogDescription>
            Are you sure you want to accept this shift swap? This action will notify the other party and you will need to contact rosters to have shift approved. Once approved remember to Finalise Swap and update you roster.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Accepting..." : "Accept Swap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
