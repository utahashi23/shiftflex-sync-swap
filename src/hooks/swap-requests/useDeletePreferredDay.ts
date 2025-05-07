
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { deletePreferredDateApi } from './api';

interface UseDeletePreferredDayOptions {
  onSuccess: (data: any, requestId: string) => void;
}

export const useDeletePreferredDay = ({ onSuccess }: UseDeletePreferredDayOptions) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  /**
   * Delete a single preferred date from a swap request
   */
  const deletePreferredDay = async (dayId: string, requestId: string) => {
    if (!dayId || !requestId) {
      toast({
        title: "Error",
        description: "Invalid day ID or request ID",
        variant: "destructive"
      });
      return false;
    }
    
    setIsDeleting(true);
    
    try {
      // Call the API to delete the preferred date
      const result = await deletePreferredDateApi(dayId, requestId);
      
      if (result.success) {
        // Only display toast if the request wasn't deleted entirely
        if (!result.requestDeleted) {
          toast({
            title: "Preferred Date Removed",
            description: "The selected date has been removed from your swap request."
          });
        }
        
        // Call the onSuccess callback with the result data and requestId
        onSuccess(result, requestId);
        return true;
      } else {
        // Fixed: Use a custom message instead of accessing a non-existent error property
        throw new Error('Failed to delete preferred date');
      }
    } catch (error) {
      console.error('Error deleting preferred date:', error);
      toast({
        title: "Failed to delete date",
        description: "There was a problem removing your preferred date",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deletePreferredDay,
    isDeleting
  };
};
