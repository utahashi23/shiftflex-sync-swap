
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { SwapRequest } from './types';
import { fetchSwapRequestsApi } from './api';

export const useFetchSwapRequests = (user: User | null) => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSwapRequests = useCallback(async () => {
    if (!user || !user.id) {
      console.log('No user or user ID available, skipping fetch');
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch requests directly from the database instead of using the edge function
      const formattedRequests = await fetchSwapRequestsApi(user.id);
      
      console.log('Formatted requests:', formattedRequests);
      setSwapRequests(formattedRequests);
      
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast({
        title: "Error",
        description: "Failed to load swap requests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { 
    swapRequests, 
    setSwapRequests, 
    isLoading, 
    setIsLoading, 
    fetchSwapRequests 
  };
};
