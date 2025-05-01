
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
    fetchMatchedSwaps();
  }, [user]);

  const fetchMatchedSwaps = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Fetch active matched swaps - get ALL matched swaps in the system
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
        .eq('status', 'matched');
        
      if (activeError) throw activeError;
      
      // Fetch completed swaps - get ALL completed swaps in the system
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
        .eq('status', 'completed');
        
      if (completedError) throw completedError;
      
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
      
      // Fetch all shift details with profile information
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*, profiles(first_name, last_name)')
        .in('id', allShiftIds);
        
      if (shiftsError) throw shiftsError;
      
      // Process active matches
      const formattedActiveMatches = processSwapRequests(activeMatches || [], shiftsData || [], user.id);
      setSwapRequests(formattedActiveMatches);
      
      // Process completed matches
      const formattedCompletedMatches = processSwapRequests(completedMatches || [], shiftsData || [], user.id);
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
    handleAcceptSwap
  };
};
