
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
      
      // Fetch active matched swaps where the user is involved
      const { data: activeMatches, error: activeError } = await supabase
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
        
      if (activeError) {
        console.error('Error fetching matched swaps:', activeError);
        throw activeError;
      }
      
      console.log('Active matched swaps:', activeMatches);
      
      // Fetch completed swaps where the user is involved
      const { data: completedMatches, error: completedError } = await supabase
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
      
      console.log('Completed swaps:', completedMatches);
      
      // If no data, set empty arrays and return
      if ((!activeMatches || activeMatches.length === 0) && 
          (!completedMatches || completedMatches.length === 0)) {
        setSwapRequests([]);
        setPastSwaps([]);
        setIsLoading(false);
        return;
      }
      
      // Get all shift IDs to fetch in one query
      const allShiftIds = [
        ...(activeMatches || []).map(m => m.requester_shift_id),
        ...(activeMatches || []).map(m => m.acceptor_shift_id).filter(Boolean),
        ...(completedMatches || []).map(m => m.requester_shift_id),
        ...(completedMatches || []).map(m => m.acceptor_shift_id).filter(Boolean)
      ].filter(Boolean) as string[];
      
      if (allShiftIds.length === 0) {
        setSwapRequests([]);
        setPastSwaps([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch all shift details
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', allShiftIds);
        
      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        throw shiftsError;
      }
      
      console.log('Fetched shifts data:', shiftsData);
      
      // Get ALL user IDs involved in swaps
      const userIds = [
        ...(activeMatches || []).map(m => m.requester_id),
        ...(activeMatches || []).map(m => m.acceptor_id).filter(Boolean),
        ...(completedMatches || []).map(m => m.requester_id),
        ...(completedMatches || []).map(m => m.acceptor_id).filter(Boolean),
      ].filter((id, index, self) => {
        // Filter out duplicate user IDs and make sure none of them is the admin ID
        return id && id !== '7c31ceb6-bec9-4ea8-b65a-b6629547b52e' && self.indexOf(id) === index;
      }) as string[];
      
      console.log('Fetching profiles for user IDs:', userIds);
      
      // Fetch profiles for all users involved
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
        
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
      
      // Process active matches
      const formattedActiveMatches = processSwapRequests(activeMatches || [], shiftsData || [], user.id, profilesMap);
      setSwapRequests(formattedActiveMatches);
      
      // Process completed matches
      const formattedCompletedMatches = processSwapRequests(completedMatches || [], shiftsData || [], user.id, profilesMap);
      setPastSwaps(formattedCompletedMatches);
      
      console.log('Processed active matches:', formattedActiveMatches);
      console.log('Processed completed matches:', formattedCompletedMatches);
      
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
