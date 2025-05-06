
import { useState } from 'react';
import { deletePreferredDateApi } from './api';

interface UseDeletePreferredDayOptions {
  onSuccess?: (data: { success: boolean; requestDeleted: boolean; preferredDayId: string }, requestId: string) => void;
}

export const useDeletePreferredDay = (options: UseDeletePreferredDayOptions = {}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deletePreferredDay = async (dayId: string, requestId: string) => {
    if (!dayId || !requestId) {
      return { success: false };
    }
    
    setIsDeleting(true);
    
    try {
      // Call the API to delete the preferred date
      const result = await deletePreferredDateApi(dayId, requestId);
      
      // If success callback is provided, call it
      if (options.onSuccess) {
        options.onSuccess({
          ...result,
          preferredDayId: dayId
        }, requestId);
      }
      
      return result;
    } catch (error) {
      console.error('Error in useDeletePreferredDay:', error);
      return { success: false };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deletePreferredDay,
    isDeleting
  };
};
