
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveBlock, UserLeaveBlock } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
      // Use the RLS-bypassing function to get user leave blocks
      const { data, error } = await supabase.rpc('get_user_leave_blocks', {
        p_user_id: supabase.auth.getUser().then(res => res.data.user?.id),
      });
        
      if (error) throw error;
      return data as UserLeaveBlock[];
    }
  });
  
  // Add a leave block for the current user
  const addLeaveBlockMutation = useMutation({
    mutationFn: async ({ leaveBlockId }: { leaveBlockId: string }) => {
      const { data, error } = await supabase
        .from('user_leave_blocks')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
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

  // Format date to display in a user-friendly format
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy');
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
    refetchLeaveBlocks,
    refetchUserLeaveBlocks,
    formatDate
  };
};
