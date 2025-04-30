
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

interface SwapDeleteDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDelete: () => void;
  isDateOnly: boolean;
}

const SwapDeleteDialog = ({
  isOpen,
  isLoading,
  onOpenChange,
  onDelete,
  isDateOnly
}: SwapDeleteDialogProps) => {
  console.log("Rendering SwapDeleteDialog with isOpen:", isOpen, "isDateOnly:", isDateOnly);

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDateOnly ? "Remove Preferred Date?" : "Delete Swap Request?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDateOnly
              ? "Are you sure you want to remove this preferred date from your swap request?"
              : "Are you sure you want to delete this entire swap request?"
            }
            <br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SwapDeleteDialog;
