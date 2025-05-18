import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface ShiftSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  preventAutoClose?: boolean;  // New prop to prevent automatic closing
}

export const ShiftSwapDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  children,
  preventAutoClose = false  // Default to false for backward compatibility
}: ShiftSwapDialogProps) => {
  // Wrapper function to handle dialog closing with validation
  const handleOpenChange = (newOpenState: boolean) => {
    // If closing the dialog and preventAutoClose is true, we'll ignore the automatic close attempt
    if (!newOpenState && preventAutoClose) {
      return;
    }
    
    // Otherwise, honor the requested open change
    onOpenChange(newOpenState);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => {
        // Prevent dialog from closing when clicking inside the calendar
        if ((e.target as HTMLElement).closest('.rdp')) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-auto py-4 pr-4" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {children}
        </ScrollArea>
        
        <DialogFooter className="mt-4 pt-2 border-t">
          {onCancel && (
            <Button 
              variant="outline" 
              onClick={() => {
                if (onCancel) onCancel();
                else onOpenChange(false);
              }}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
