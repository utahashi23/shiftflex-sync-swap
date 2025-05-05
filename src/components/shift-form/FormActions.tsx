
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  isEdit: boolean;
  isLoading: boolean;
  isFormComplete: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const FormActions = ({
  isEdit,
  isLoading,
  isFormComplete,
  onSave,
  onCancel,
  onDelete
}: FormActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-4">
      {isEdit ? (
        <>
          <Button 
            type="submit" 
            className="flex-1"
            disabled={!isFormComplete || isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          {onDelete && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={onDelete}
              disabled={isLoading}
            >
              Delete
            </Button>
          )}
        </>
      ) : (
        <>
          <Button 
            type="submit" 
            className="flex-1"
            disabled={!isFormComplete || isLoading}
          >
            {isLoading ? "Adding..." : "Add Shift"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </>
      )}
    </div>
  );
};
