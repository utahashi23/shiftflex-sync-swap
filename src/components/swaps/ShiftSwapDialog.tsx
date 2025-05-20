
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  preventAutoClose?: boolean;
  confirmDisabled?: boolean;
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
  preventAutoClose = false,
  confirmDisabled = false
}: ShiftSwapDialogProps) => {
  // Create a wrapped onOpenChange handler that respects preventAutoClose
  const handleOpenChange = (newOpenState: boolean) => {
    // If attempting to close the dialog (newOpenState is false) and preventAutoClose is true
    // then we don't allow automatic closing
    if (!newOpenState && preventAutoClose) {
      // Do nothing, which prevents the dialog from closing
      return;
    }
    
    // In all other cases, we pass the open state change to the parent component
    onOpenChange(newOpenState);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-md max-h-[90vh]" 
        onPointerDownOutside={(e) => {
          // Prevent dialog from closing when clicking inside calendar elements
          if ((e.target as HTMLElement).closest('.rdp')) {
            e.preventDefault();
          }
          
          // Also prevent closing if preventAutoClose is true
          if (preventAutoClose) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing with Escape key if preventAutoClose is true
          if (preventAutoClose) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="py-4">
            {children}
          </div>
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
            disabled={isLoading || confirmDisabled}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
