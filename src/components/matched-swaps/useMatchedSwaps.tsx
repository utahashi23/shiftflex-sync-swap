
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MatchedSwap, ConfirmDialogState } from './types';
import { processSwapRequests } from './utils';

export const useMatchedSwaps = () => {
  const [swapRequests, setSwapRequests] = useState<MatchedSwap[]>([]);
  const [pastSwaps, setPastSwaps] = useState<MatchedSwap[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    swapId: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMatchedSwaps();
    }
  }, [user]);

  const fetchMatchedSwaps = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      console.log('Fetching matched swaps for user', user.id);
      
      // Fetch both matched swap requests first
      const { data: matchedRequests, error: matchedError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id
        `)
        .eq('status', 'matched')
        .or(`requester_id.eq.${user.id},acceptor_id.eq.${user.id}`);
        
      if (matchedError) {
        console.error('Error fetching matched swaps:', matchedError);
        throw matchedError;
      }
      
      console.log('Active matched swaps:', matchedRequests);
      
      // Fetch completed swaps where the user is involved
      const { data: completedRequests, error: completedError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id
        `)
        .eq('status', 'completed')
        .or(`requester_id.eq.${user.id},acceptor_id.eq.${user.id}`);
        
      if (completedError) {
        console.error('Error fetching completed swaps:', completedError);
        throw completedError;
      }
      
      console.log('Completed swaps:', completedRequests);
      
      // If no data, set empty arrays and return
      if ((!matchedRequests || matchedRequests.length === 0) && 
          (!completedRequests || completedRequests.length === 0)) {
        setSwapRequests([]);
        setPastSwaps([]);
        setIsLoading(false);
        return;
      }
      
      // Get ALL relevant shift IDs for fetching shift details
      const shiftIds = new Set<string>();
      
      matchedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      completedRequests?.forEach(req => {
        if (req.requester_shift_id) shiftIds.add(req.requester_shift_id);
        if (req.acceptor_shift_id) shiftIds.add(req.acceptor_shift_id);
      });
      
      // Fetch the actual shift data for all shift IDs
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', Array.from(shiftIds));
        
      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        throw shiftsError;
      }
      
      console.log('Fetched shifts data:', shiftsData);
      
      // Get ALL user IDs involved in swaps
      const userIds = new Set<string>();
      
      matchedRequests?.forEach(req => {
        if (req.requester_id) userIds.add(req.requester_id);
        if (req.acceptor_id) userIds.add(req.acceptor_id);
      });
      
      completedRequests?.forEach(req => {
        if (req.requester_id) userIds.add(req.requester_id);
        if (req.acceptor_id) userIds.add(req.acceptor_id);
      });
      
      // Remove admin ID and empty values
      const filteredUserIds = [...userIds].filter(id => 
        id && id !== '7c31ceb6-bec9-4ea8-b65a-b6629547b52e'
      );
      
      console.log('Fetching profiles for user IDs:', filteredUserIds);
      
      // Fetch profiles for all users involved
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', filteredUserIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      console.log('Fetched profiles data:', profilesData);
      
      // Create a map of profiles by user ID for quick lookup
      const profilesMap = (profilesData || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Now join shift data with request data
      const matchedRequestsWithShifts = matchedRequests?.map(req => {
        const requesterShift = shiftsData?.find(s => s.id === req.requester_shift_id);
        const acceptorShift = shiftsData?.find(s => s.id === req.acceptor_shift_id);
        
        return {
          ...req,
          requester_shift: requesterShift,
          acceptor_shift: acceptorShift
        };
      });
      
      const completedRequestsWithShifts = completedRequests?.map(req => {
        const requesterShift = shiftsData?.find(s => s.id === req.requester_shift_id);
        const acceptorShift = shiftsData?.find(s => s.id === req.acceptor_shift_id);
        
        return {
          ...req,
          requester_shift: requesterShift,
          acceptor_shift: acceptorShift
        };
      });
      
      // Process active matches
      const formattedActiveMatches = processSwapRequests(matchedRequestsWithShifts || [], shiftsData || [], user.id, profilesMap);
      setSwapRequests(formattedActiveMatches);
      
      // Process completed matches
      const formattedCompletedMatches = processSwapRequests(completedRequestsWithShifts || [], shiftsData || [], user.id, profilesMap);
      setPastSwaps(formattedCompletedMatches);
      
    } catch (error) {
      console.error('Error fetching matched swaps:', error);
      toast({
        title: "Failed to load matched swaps",
        description: "There was a problem loading your matched swaps. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMatches = () => {
    console.log('Refreshing matched swaps');
    fetchMatchedSwaps();
  };

  const handleAcceptSwap = async () => {
    if (!confirmDialog.swapId || !user) return;
    
    setIsLoading(true);
    
    try {
      // Update the swap request status in the database
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status: 'completed' })
        .eq('id', confirmDialog.swapId);
        
      if (error) throw error;
      
      // Update the UI
      const completedSwap = swapRequests.find(s => s.id === confirmDialog.swapId);
      if (completedSwap) {
        // Move from active to completed
        setSwapRequests(prev => prev.filter(s => s.id !== confirmDialog.swapId));
        setPastSwaps(prev => [
          ...prev, 
          { ...completedSwap, status: 'completed' }
        ]);
      }
      
      toast({
        title: "Swap Accepted",
        description: "The shift swap has been successfully accepted.",
      });
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConfirmDialog({ isOpen: false, swapId: null });
      setIsLoading(false);
    }
  };

  return {
    swapRequests,
    pastSwaps,
    activeTab,
    setActiveTab,
    confirmDialog,
    setConfirmDialog,
    isLoading,
    handleAcceptSwap,
    refreshMatches
  };
};
