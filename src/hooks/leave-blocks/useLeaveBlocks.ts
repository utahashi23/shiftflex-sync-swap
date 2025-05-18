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
      
      // Transform the data to match our UserLeaveBlock type
      const transformedData: UserLeaveBlock[] = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        leave_block_id: item.leave_block_id,
        block_number: item.leave_block.block_number,
        start_date: item.leave_block.start_date,
        end_date: item.leave_block.end_date,
        status: item.status,
        created_at: item.created_at,
        split_designation: item.leave_block.split_designation as 'A' | 'B' | null | undefined,
        original_block_id: item.leave_block.original_block_id
      })) || [];
      
      setLeaveBlocks(transformedData);
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
          requested_leave_block_id: null, // Set to null initially since we don't know what block the user wants to swap with yet
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

  const splitLeaveBlock = useCallback(async (blockId: string) => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('split_leave_block', {
        body: { user_leave_block_id: blockId, user_id: user.id }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Block Split",
          description: "Your leave block has been split into two equal parts"
        });
        
        await fetchLeaveBlocks();
        return true;
      } else {
        throw new Error(data.error || 'Failed to split block');
      }
      
    } catch (error) {
      console.error('Error splitting leave block:', error);
      toast({
        title: "Error",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? error.message as string 
          : "Failed to split leave block",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchLeaveBlocks]);

  const joinLeaveBlocks = useCallback(async (blockAId: string, blockBId: string) => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('join_leave_blocks', {
        body: { 
          block_a_id: blockAId, 
          block_b_id: blockBId,
          user_id: user.id 
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Blocks Joined",
          description: "Your leave blocks have been successfully joined"
        });
        
        await fetchLeaveBlocks();
        return true;
      } else {
        throw new Error(data.error || 'Failed to join blocks');
      }
      
    } catch (error) {
      console.error('Error joining leave blocks:', error);
      toast({
        title: "Error",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? error.message as string 
          : "Failed to join leave blocks",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchLeaveBlocks]);

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
    createLeaveSwapRequest,
    splitLeaveBlock,
    joinLeaveBlocks
  };
};
