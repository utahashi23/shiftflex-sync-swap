
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Types
export type SwapStatus = 'pending' | 'matched' | 'confirmed' | 'completed';

export type ImprovedSwap = {
  id: string;
  wanted_date: string;
  accepted_shift_types: string[];
  status: SwapStatus;
  matched_with_id: string | null;
  requester_id: string;
  requester_shift_id: string;
  created_at: string;
  updated_at: string;
};

export type SwapMatch = {
  request1_id: string;
  request2_id: string;
  requester1_id: string;
  requester2_id: string;
  compatibility_score: number;
  shift1_details: any;
  shift2_details: any;
  is_requester1: boolean;
  my_shift: any;
  other_shift: any;
};

export const useImprovedSwapMatches = () => {
  const [swaps, setSwaps] = useState<ImprovedSwap[]>([]);
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // Fetch user swaps
  const fetchUserSwaps = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('improved_shift_swaps')
        .select('*')
        .eq('requester_id', user.id);
      
      if (error) throw error;
      
      // Type cast the data to ensure status is of the correct type
      const typedData = data?.map(swap => ({
        ...swap,
        status: swap.status as SwapStatus
      })) || [];
      
      setSwaps(typedData);
      console.log(`Found ${typedData?.length || 0} swap requests for user`);
    } catch (err: any) {
      console.error('Error fetching swap requests:', err);
      setError(err);
      toast({
        title: "Failed to load swap requests",
        description: err.message || "There was a problem loading your swap requests",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Find potential matches
  const findMatches = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('new_find_swap_matches');
      
      if (error) throw error;
      
      if (data?.success && data?.data?.matches) {
        setMatches(data.data.matches);
        console.log(`Found ${data.data.matches.length} potential matches`);
      } else {
        console.log('No matches found or unexpected response format');
        setMatches([]);
      }
    } catch (err: any) {
      console.error('Error finding matches:', err);
      setError(err);
      toast({
        title: "Failed to find matches",
        description: err.message || "There was a problem finding swap matches",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Create a swap request
  const createSwapRequest = async (
    shiftId: string,
    wantedDate: string,
    acceptedTypes: string[] = ['day', 'afternoon', 'night']
  ) => {
    if (!user) return false;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .from('improved_shift_swaps')
        .insert({
          requester_id: user.id,
          requester_shift_id: shiftId,
          wanted_date: wantedDate,
          accepted_shift_types: acceptedTypes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Swap Request Created",
        description: "Your shift swap request has been created successfully"
      });
      
      // Refresh swaps after creating a new one
      await fetchUserSwaps();
      return true;
    } catch (err: any) {
      console.error('Error creating swap request:', err);
      setError(err);
      toast({
        title: "Failed to create request",
        description: err.message || "There was a problem creating your swap request",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Accept a match
  const acceptMatch = async (requestId: string) => {
    if (!user) return false;
    
    setIsProcessing(true);
    try {
      const response = await supabase.functions.invoke('new_accept_swap_match', {
        body: { request_id: requestId }
      });
      
      if (response.error) throw new Error(response.error.message || 'Failed to accept swap match');
      
      // Check for errors in the response data
      if (response.data && !response.data.success) {
        throw new Error(response.data.error || 'Failed to accept swap match');
      }
      
      toast({
        title: "Swap Accepted",
        description: response.data?.data?.message || "You have successfully accepted the swap"
      });
      
      // Refresh data after accepting
      await fetchUserSwaps();
      await findMatches();
      return true;
    } catch (err: any) {
      console.error('Error accepting match:', err);
      setError(err);
      toast({
        title: "Failed to accept swap",
        description: err.message || "There was a problem accepting the swap",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete a swap request
  const deleteSwapRequest = async (requestId: string) => {
    if (!user) return false;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('improved_shift_swaps')
        .delete()
        .eq('id', requestId)
        .eq('requester_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Request Deleted",
        description: "Your shift swap request has been deleted"
      });
      
      // Refresh swaps after deleting
      await fetchUserSwaps();
      return true;
    } catch (err: any) {
      console.error('Error deleting swap request:', err);
      setError(err);
      toast({
        title: "Failed to delete request",
        description: err.message || "There was a problem deleting your swap request",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchUserSwaps();
    }
  }, [user]);

  return {
    swaps,
    matches,
    isLoading,
    isProcessing,
    error,
    fetchUserSwaps,
    findMatches,
    createSwapRequest,
    acceptMatch,
    deleteSwapRequest
  };
};
