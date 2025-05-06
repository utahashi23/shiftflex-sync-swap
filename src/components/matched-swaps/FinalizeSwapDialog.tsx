
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FinalizeSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const FinalizeSwapDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  isLoading 
}: FinalizeSwapDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalize Shift Swap</DialogTitle>
          <DialogDescription>
            Are you sure you want to finalize this shift swap? This will update both users' calendars and complete the swap process.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> If you have a shared calendar, you'll need to manually update your external calendar to reflect this swap.
          </p>
        </div>
        
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
            {isLoading ? "Finalizing..." : "Finalize Swap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
