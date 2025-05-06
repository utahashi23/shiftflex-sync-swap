
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { SwapRequest } from './types';
import { deleteSwapRequestApi } from './api';
import { useAuth } from '@/hooks/useAuth';

export const useDeleteSwapRequest = (
  setSwapRequests: React.Dispatch<React.SetStateAction<SwapRequest[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Delete an entire swap request
  const handleDeleteSwapRequest = async (requestId: string) => {
    if (!requestId || !user) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive"
      });
      return false;
    }
    
    setIsDeleting(true);
    setIsLoading(true);
    
    try {
      console.log('Deleting swap request:', requestId);
      
      // Call the API to delete the swap request
      const result = await deleteSwapRequestApi(requestId);
      
      if (result.success) {
        // Update local state after successful deletion
        setSwapRequests(prev => prev.filter(req => req.id !== requestId));
        return true;
      } else {
        throw new Error('Failed to delete swap request');
      }
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Delete Failed",
        description: "There was a problem deleting your swap request. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsDeleting(false);
      setIsLoading(false);
    }
  };

  return {
    handleDeleteSwapRequest,
    isDeleting
  };
};
