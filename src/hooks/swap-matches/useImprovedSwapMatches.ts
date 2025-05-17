
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Types
export type SwapStatus = 'pending' | 'matched' | 'confirmed' | 'completed';

export type ImprovedSwap = {
  id: string;
  wanted_date: string;
  wantedDates?: string[];
  accepted_shift_types: string[];
  status: SwapStatus;
  matched_with_id: string | null;
  requester_id: string;
  requester_shift_id: string;
  created_at: string;
  updated_at: string;
  shiftDetails?: any;
  regionPreferences?: any[];
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
      const { data: swapData, error: swapError } = await supabase
        .from('improved_shift_swaps')
        .select('*')
        .eq('requester_id', user.id);
      
      if (swapError) throw swapError;

      // Get shift details for each swap
      const enhancedSwaps = await Promise.all((swapData || []).map(async (swap) => {
        // Type cast the data to ensure status is of the correct type
        const typedSwap = {
          ...swap,
          status: swap.status as SwapStatus
        };

        // Fetch shift details
        const { data: shiftData } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', swap.requester_shift_id)
          .single();

        // Fetch wanted dates (if multiple)
        // Use direct TypeScript casting to bypass type checking for now
        const { data: wantedDatesData } = await (supabase as any)
          .from('improved_swap_wanted_dates')
          .select('*')
          .eq('swap_id', swap.id);

        // Format region preferences (stub for now - we'll implement this properly later)
        const regionPreferences: any[] = [];

        return {
          ...typedSwap,
          shiftDetails: shiftData || null,
          wantedDates: wantedDatesData ? wantedDatesData.map((d: any) => d.date) : [],
          regionPreferences
        };
      }));
      
      setSwaps(enhancedSwaps);
      console.log(`Found ${enhancedSwaps?.length || 0} swap requests for user`);
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
      const { data, error } = await supabase.functions.invoke('new_find_swap_matches', {
        body: { user_id: user.id, verbose: true }
      });
      
      if (error) throw error;
      
      if (data?.success && data?.data?.matches) {
        setMatches(data.data.matches);
        console.log(`Found ${data.data.matches.length} potential matches`);
        
        // Log match details for debugging
        if (data.data.matches.length === 0) {
          console.warn('No matches found despite success response, checking raw response:');
          console.log('Full response data:', data);
        } else {
          // Log first match details for debugging
          const firstMatch = data.data.matches[0];
          console.log('Sample match details:', {
            request1_id: firstMatch.request1_id,
            request2_id: firstMatch.request2_id,
            compatibility_score: firstMatch.compatibility_score,
            myShift: {
              date: firstMatch.my_shift?.date,
              type: firstMatch.my_shift?.type
            },
            otherShift: {
              date: firstMatch.other_shift?.date,
              type: firstMatch.other_shift?.type,
              userName: firstMatch.other_shift?.userName
            }
          });
        }
      } else {
        console.log('No matches found or unexpected response format');
        console.log('Full response:', data);
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

  // Create a swap request with multiple wanted dates
  const createSwapRequest = async (
    shiftId: string,
    wantedDates: string[] = [],
    acceptedTypes: string[] = ['day', 'afternoon', 'night'],
    regionPreferences: { region_id: string, area_id?: string }[] = []
  ) => {
    if (!user) return false;
    
    setIsProcessing(true);
    try {
      // First create the main swap request (using first date as primary)
      const { data, error } = await supabase
        .from('improved_shift_swaps')
        .insert({
          requester_id: user.id,
          requester_shift_id: shiftId,
          wanted_date: wantedDates[0] || new Date().toISOString().split('T')[0],
          accepted_shift_types: acceptedTypes
        })
        .select()
        .single();
      
      if (error) throw error;

      // If we have additional dates, add them to the secondary table
      if (wantedDates.length > 1) {
        // Skip the first date as it's already in the main record
        const additionalDatesPromises = wantedDates.slice(1).map(async (date) => {
          // Use TypeScript casting to bypass type checking
          const { error: dateError } = await (supabase as any)
            .from('improved_swap_wanted_dates')
            .insert({
              swap_id: data.id,
              date: date
            });
          
          if (dateError) {
            console.error('Error adding date:', date, dateError);
          }
        });

        await Promise.all(additionalDatesPromises);
      }

      // Add region/area preferences if any (stubbed for now)
      if (regionPreferences.length > 0) {
        console.log("Region preferences will be implemented in a future update");
      }
      
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
        body: { request_id: requestId, user_id: user.id }
      });
      
      if (response.error) throw new Error(response.error.message || 'Failed to accept swap match');
      
      // Check for errors in the response data
      if (response.data && !response.data.success) {
        throw new Error(response.data.error || 'Failed to accept swap match');
      }
      
      toast({
        title: "Swap Accepted",
        description: response.data?.message || "You have successfully accepted the swap"
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
      // Delete any additional wanted dates first
      // Use TypeScript casting to bypass type checking
      const { error: wantedDatesError } = await (supabase as any)
        .from('improved_swap_wanted_dates')
        .delete()
        .eq('swap_id', requestId);
        
      if (wantedDatesError) {
        console.error('Error deleting wanted dates:', wantedDatesError);
      }
      
      // Delete any region/area preferences (not implemented yet)
      
      // Then delete the main swap record
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
