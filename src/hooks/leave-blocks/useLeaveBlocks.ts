
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { UserLeaveBlock } from '@/types/leave-blocks';

export const useLeaveBlocks = () => {
  const [leaveBlocks, setLeaveBlocks] = useState<UserLeaveBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchLeaveBlocks = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('user_leave_blocks')
        .select('*, leave_block:leave_block_id(*)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      
      setLeaveBlocks(data || []);
    } catch (error) {
      console.error('Error fetching leave blocks:', error);
      toast({
        title: "Error",
        description: "Failed to load leave blocks",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createLeaveSwapRequest = useCallback(async (leaveBlockId: string) => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .insert({
          requester_id: user.id,
          requester_leave_block_id: leaveBlockId,
          status: 'pending'
        })
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Request Created",
        description: "Your leave swap request has been created"
      });
      
      return true;
    } catch (error) {
      console.error('Error creating leave swap request:', error);
      toast({
        title: "Error",
        description: "Failed to create leave swap request",
        variant: "destructive"
      });
      return false;
    }
  }, [user]);

  // Load leave blocks on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchLeaveBlocks();
    }
  }, [user, fetchLeaveBlocks]);

  return {
    leaveBlocks,
    isLoading,
    refreshLeaveBlocks: fetchLeaveBlocks,
    createLeaveSwapRequest
  };
};
