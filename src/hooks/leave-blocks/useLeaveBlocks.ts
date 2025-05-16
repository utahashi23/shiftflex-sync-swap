
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveBlock, UserLeaveBlock } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, addDays } from 'date-fns';

export const useLeaveBlocks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch all leave blocks (available periods)
  const {
    data: allLeaveBlocks,
    isLoading: isLoadingLeaveBlocks,
    error: leaveBlocksError,
    refetch: refetchLeaveBlocks
  } = useQuery({
    queryKey: ['leave-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_blocks')
        .select('*')
        .order('block_number', { ascending: true });
        
      if (error) throw error;
      return data as LeaveBlock[];
    }
  });
  
  // Fetch user's leave blocks
  const {
    data: userLeaveBlocks,
    isLoading: isLoadingUserLeaveBlocks,
    error: userLeaveBlocksError,
    refetch: refetchUserLeaveBlocks
  } = useQuery({
    queryKey: ['user-leave-blocks'],
    queryFn: async () => {
      // Get current user's ID first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Use the RLS-bypassing function to get user leave blocks
      const { data, error } = await supabase.rpc('get_user_leave_blocks', {
        p_user_id: user.id,
      });
        
      if (error) throw error;
      return data as UserLeaveBlock[];
    }
  });
  
  // Add a leave block for the current user
  const addLeaveBlockMutation = useMutation({
    mutationFn: async ({ leaveBlockId }: { leaveBlockId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from('user_leave_blocks')
        .insert({
          user_id: user.id,
          leave_block_id: leaveBlockId,
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Leave block added',
        description: 'Your leave block has been added successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['user-leave-blocks'] });
    },
    onError: (error) => {
      toast({
        title: 'Error adding leave block',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Remove a leave block from the user's list
  const removeLeaveBlockMutation = useMutation({
    mutationFn: async ({ userLeaveBlockId }: { userLeaveBlockId: string }) => {
      const { data, error } = await supabase
        .from('user_leave_blocks')
        .delete()
        .eq('id', userLeaveBlockId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Leave block removed',
        description: 'Your leave block has been removed successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['user-leave-blocks'] });
    },
    onError: (error) => {
      toast({
        title: 'Error removing leave block',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Split a leave block into two equal parts (A and B designations)
  // Updated to use edge function instead of direct inserts to bypass RLS issues
  const splitLeaveBlockMutation = useMutation({
    mutationFn: async ({ userLeaveBlockId }: { userLeaveBlockId: string }) => {
      // First, get the leave block details
      const userLeaveBlock = userLeaveBlocks?.find(block => block.id === userLeaveBlockId);
      if (!userLeaveBlock) throw new Error("Leave block not found");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Use the edge function to handle the split operation (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('split_leave_block', {
        body: { 
          user_leave_block_id: userLeaveBlockId,
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Leave block split',
        description: 'Your leave block has been split into two equal parts (A and B).',
      });
      queryClient.invalidateQueries({ queryKey: ['user-leave-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['leave-blocks'] });
    },
    onError: (error) => {
      toast({
        title: 'Error splitting leave block',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Join two split leave blocks back into one
  const joinLeaveBlocksMutation = useMutation({
    mutationFn: async ({ blockAId, blockBId }: { blockAId: string, blockBId: string }) => {
      // Get the two blocks
      const blockA = userLeaveBlocks?.find(block => block.id === blockAId);
      const blockB = userLeaveBlocks?.find(block => block.id === blockBId);
      
      if (!blockA || !blockB) throw new Error("One or both leave blocks not found");
      
      if (blockA.original_block_id !== blockB.original_block_id) {
        throw new Error("These blocks cannot be joined as they're not from the same original leave block");
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Use edge function to handle the join operation (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('join_leave_blocks', {
        body: { 
          block_a_id: blockAId,
          block_b_id: blockBId,
          user_id: user.id
        }
      });
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Leave blocks joined',
        description: 'Your split leave blocks have been joined back into one block.',
      });
      queryClient.invalidateQueries({ queryKey: ['user-leave-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['leave-blocks'] });
    },
    onError: (error) => {
      toast({
        title: 'Error joining leave blocks',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Format date to display in a user-friendly format
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy');
  };

  // Check if two blocks are paired splits (A and B from same original)
  const arePairedSplitBlocks = (blockId1: string, blockId2: string) => {
    const block1 = userLeaveBlocks?.find(block => block.id === blockId1);
    const block2 = userLeaveBlocks?.find(block => block.id === blockId2);
    
    if (!block1 || !block2) return false;
    
    // Check if they have the same original block ID
    return (
      block1.original_block_id && 
      block2.original_block_id && 
      block1.original_block_id === block2.original_block_id &&
      block1.split_designation !== block2.split_designation
    );
  };

  // Find a block's pair (if it's a split block)
  const findBlockPair = (blockId: string) => {
    const block = userLeaveBlocks?.find(b => b.id === blockId);
    if (!block || !block.original_block_id || !block.split_designation) {
      return null;
    }
    
    // Look for a block with the same original ID but different designation
    return userLeaveBlocks?.find(b => 
      b.id !== blockId && 
      b.original_block_id === block.original_block_id && 
      b.split_designation !== block.split_designation
    ) || null;
  };

  return {
    allLeaveBlocks,
    userLeaveBlocks,
    isLoadingLeaveBlocks,
    isLoadingUserLeaveBlocks,
    leaveBlocksError,
    userLeaveBlocksError,
    addLeaveBlock: addLeaveBlockMutation.mutate,
    isAddingLeaveBlock: addLeaveBlockMutation.isPending,
    removeLeaveBlock: removeLeaveBlockMutation.mutate,
    isRemovingLeaveBlock: removeLeaveBlockMutation.isPending,
    splitLeaveBlock: splitLeaveBlockMutation.mutate,
    isSplittingLeaveBlock: splitLeaveBlockMutation.isPending,
    joinLeaveBlocks: joinLeaveBlocksMutation.mutate,
    isJoiningLeaveBlocks: joinLeaveBlocksMutation.isPending,
    refetchLeaveBlocks,
    refetchUserLeaveBlocks,
    formatDate,
    arePairedSplitBlocks,
    findBlockPair
  };
};
