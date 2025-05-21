
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SwapRequest, PreferredDate, DeletePreferredDateResult } from './types';
import { getUserSwapRequestsApi } from './api';
import { deleteSwapRequestApi } from './deleteSwapRequest';
import { deletePreferredDateApi } from './deletePreferredDate';
import { createSwapRequestApi } from './createSwapRequest';

export const useSwapRequests = (defaultStatus: string = 'pending') => {
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<string>(defaultStatus);
  const [matches, setMatches] = useState<any[]>([]);
  const [pastMatches, setPastMatches] = useState<any[]>([]);
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
      
      const result = await getUserSwapRequestsApi(requestStatus);
      
      // Check if result is an object with an error property
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(String(result.error));
      }
      
      // Set the requests from the result, ensuring we handle both array and object responses
      if (Array.isArray(result)) {
        setRequests(result);
      } else if (result && typeof result === 'object' && 'requests' in result) {
        // Use type assertion to tell TypeScript this is an object with a requests property
        const resultWithRequests = result as { requests?: SwapRequest[] };
        setRequests(resultWithRequests.requests || []);
      } else {
        setRequests([]);
      }
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
    if (!requestId) {
      toast({
        title: 'Error',
        description: 'Invalid request ID',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      setIsDeleting(true);
      
      console.log(`Deleting swap request with ID: ${requestId}`);
      const result = await deleteSwapRequestApi(requestId);
      
      if (!result) {
        throw new Error('Failed to delete swap request');
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

  const handleDeletePreferredDate = async (dayId: string, requestId: string): Promise<DeletePreferredDateResult> => {
    if (!user) return { success: false, error: 'Authentication required' };
    if (!dayId || !requestId) {
      toast({
        title: 'Error',
        description: 'Missing day ID or request ID',
        variant: 'destructive',
      });
      return { success: false, error: 'Missing required parameters' };
    }
    
    try {
      setIsDeleting(true);
      
      console.log(`Attempting to delete preferred date ${dayId} from request ${requestId}`);
      const result = await deletePreferredDateApi(dayId, requestId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete preferred date');
      }
      
      if (result.requestDeleted) {
        // If the entire request was deleted, update requests state
        console.log('Last preferred date deleted, removing entire request');
        setRequests(prev => prev.filter(req => req.id !== requestId));
        toast({
          title: 'Success',
          description: 'Request deleted as it had no remaining preferred dates',
        });
      } else {
        // Otherwise update the request's preferred dates
        console.log('Preferred date removed, updating request');
        setRequests(prev => 
          prev.map(req => {
            if (req.id === requestId) {
              return {
                ...req,
                preferredDates: req.preferredDates?.filter(pd => pd.id !== dayId)
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
      
      return result;
    } catch (err: any) {
      console.error('Error deleting preferred date:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete preferred date',
        variant: 'destructive',
      });
      return { success: false, error: err.message || 'Failed to delete preferred date' };
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

  const refreshMatches = useCallback(() => {
    // This function is used by other components to refresh matches
    console.log('Refreshing matches');
    return fetchRequests();
  }, [fetchRequests]);

  // Enhanced createSwapRequest to handle multiple shift IDs and required skillset
  const createSwapRequest = async (shiftIds: string[], wantedDates: string[], acceptedTypes: string[], requiredSkillset?: string[]) => {
    try {
      console.log('Creating swap requests with params:', { shiftIds, wantedDates, acceptedTypes, requiredSkillset });
      
      if (!shiftIds.length || !wantedDates.length || !acceptedTypes.length) {
        toast({
          title: 'Error',
          description: 'Missing required parameters for swap request',
          variant: 'destructive',
        });
        return false;
      }
      
      // Create preferred dates array with accepted types
      const preferredDates = wantedDates.map(date => ({
        date,
        acceptedTypes
      }));
      
      // Create a swap request for each shift
      for (const shiftId of shiftIds) {
        await createSwapRequestApi(shiftId, preferredDates, requiredSkillset);
      }
      
      // Refresh requests after creation
      await fetchRequests();
      
      return true;
      
    } catch (err: any) {
      console.error('Error in createSwapRequest:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create swap request',
        variant: 'destructive',
      });
      return false;
    }
  };

  const fetchSwapRequests = fetchRequests;

  // Alias for consistent naming with other components
  const deleteRequest = handleDeleteRequest;
  const deletePreferredDay = handleDeletePreferredDate;

  return {
    // Original properties
    requests,
    isLoading,
    isDeleting,
    error,
    status,
    changeStatus,
    fetchRequests,
    deleteRequest,
    deletePreferredDate: handleDeletePreferredDate,
    
    // Additional properties needed by components
    matches,
    pastMatches,
    refreshMatches,
    createSwapRequest,
    fetchSwapRequests,
    deleteSwapRequest: handleDeleteRequest,
    deletePreferredDay
  };
};
