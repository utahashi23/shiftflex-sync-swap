import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SwapRequest, PreferredDate } from './types';
import { getUserSwapRequests } from './getUserSwapRequests';
import { deleteSwapRequest } from './deleteSwapRequest';
import { deletePreferredDate } from './deletePreferredDate';

export const useSwapRequests = (defaultStatus: string = 'pending') => {
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<string>(defaultStatus);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRequests = useCallback(async (newStatus?: string) => {
    if (!user) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    const requestStatus = newStatus || status;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching swap requests for user ${user.id} with status: ${requestStatus}`);
      
      const result = await getUserSwapRequests(user.id, requestStatus);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setRequests(result.requests || []);
    } catch (err: any) {
      console.error('Error fetching swap requests:', err);
      setError(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load swap requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, status, toast]);

  const handleDeleteRequest = async (requestId: string) => {
    if (!user) return false;
    
    try {
      setIsDeleting(true);
      
      const result = await deleteSwapRequest(requestId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete swap request');
      }
      
      // Update the local state to remove the deleted request
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: 'Success',
        description: 'Swap request deleted successfully',
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deleting swap request:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete swap request',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePreferredDate = async (dayId: string, requestId: string) => {
    if (!user) return false;
    
    try {
      setIsDeleting(true);
      
      const result = await deletePreferredDate(dayId, requestId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete preferred date');
      }
      
      if (result.requestDeleted) {
        // If the entire request was deleted, update requests state
        setRequests(prev => prev.filter(req => req.id !== requestId));
        toast({
          title: 'Success',
          description: 'Request deleted as it had no remaining preferred dates',
        });
      } else {
        // Otherwise update the request's preferred dates
        setRequests(prev => 
          prev.map(req => {
            if (req.id === requestId) {
              return {
                ...req,
                preferredDates: req.preferredDates.filter(pd => pd.id !== dayId)
              };
            }
            return req;
          })
        );
        toast({
          title: 'Success',
          description: 'Preferred date removed successfully',
        });
      }
      
      return true;
    } catch (err: any) {
      console.error('Error deleting preferred date:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete preferred date',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const changeStatus = useCallback((newStatus: string) => {
    setStatus(newStatus);
    fetchRequests(newStatus);
  }, [fetchRequests]);

  return {
    requests,
    isLoading,
    isDeleting,
    error,
    status,
    changeStatus,
    fetchRequests,
    deleteRequest: handleDeleteRequest,
    deletePreferredDate: handleDeletePreferredDate
  };
};
