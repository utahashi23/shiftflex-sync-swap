
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SwapDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isLoading: boolean;
  isDateOnly?: boolean;
  isMultiDelete?: boolean;
  selectionCount?: number;
}

const SwapDeleteDialog = ({
  isOpen,
  onOpenChange,
  onDelete,
  isLoading,
  isDateOnly = false,
  isMultiDelete = false,
  selectionCount = 0
}: SwapDeleteDialogProps) => {
  // Determine the right title and description based on what's being deleted
  const getDialogContent = () => {
    if (isMultiDelete) {
      return {
        title: `Delete ${selectionCount} Selected Requests?`,
        description: `This will permanently delete the ${selectionCount} selected swap requests. This action cannot be undone.`
      };
    } else if (isDateOnly) {
      return {
        title: "Delete Preferred Date?",
        description: "This will remove this date from your swap request. If this is the only date in the request, the entire request will be deleted."
      };
    } else {
      return {
        title: "Delete Swap Request?",
        description: "This will permanently delete your swap request and any matches it may have. This action cannot be undone."
      };
    }
  };

  const { title, description } = getDialogContent();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button 
            variant="destructive" 
            onClick={onDelete} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SwapDeleteDialog;
