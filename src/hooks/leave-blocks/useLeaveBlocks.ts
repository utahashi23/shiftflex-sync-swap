
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
      console.log('Fetching leave blocks for user:', user.id);
      
      // First get the current session to get the auth token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast({
          title: "Authentication Error",
          description: "Please log in again to view leave blocks",
          variant: "destructive"
        });
        throw new Error('Authentication required');
      }
      
      if (!sessionData?.session) {
        console.error('No active session found');
        toast({
          title: "Authentication Error",
          description: "Please log in again to view leave blocks",
          variant: "destructive"
        });
        throw new Error('Authentication required');
      }

      const accessToken = sessionData.session.access_token;
      console.log('Got access token:', accessToken ? 'Valid token' : 'No token');
      
      if (!accessToken) {
        console.error('No access token available');
        toast({
          title: "Authentication Error",
          description: "Please log in again to view leave blocks",
          variant: "destructive"
        });
        throw new Error('Invalid authentication token');
      }
      
      // Use the edge function to bypass RLS issues
      const { data, error } = await supabase.functions.invoke('get_user_leave_blocks', {
        body: { user_id: user.id },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (error) {
        console.error('Error fetching leave blocks via edge function:', error);
        throw error;
      }
      
      if (!data) {
        console.warn('No data returned from edge function');
        // Try direct query as fallback
        const { data: directData, error: directError } = await supabase
          .from('user_leave_blocks')
          .select('*, leave_block:leave_block_id(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true });
        
        if (directError) throw directError;
        
        // Transform the data to match our UserLeaveBlock type
        const transformedData: UserLeaveBlock[] = directData?.map(item => ({
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
        return;
      }
      
      // Edge function returned data, process it
      console.log('Leave blocks data received:', data);
      
      // Transform the data to match our UserLeaveBlock type
      const transformedData: UserLeaveBlock[] = data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        leave_block_id: item.leave_block_id,
        block_number: item.block_number,
        start_date: item.start_date,
        end_date: item.end_date,
        status: item.status,
        created_at: item.created_at,
        split_designation: item.split_designation as 'A' | 'B' | null | undefined,
        original_block_id: item.original_block_id
      }));
      
      setLeaveBlocks(transformedData);
    } catch (error) {
      console.error('Error fetching leave blocks:', error);
      toast({
        title: "Error",
        description: "Failed to load leave blocks. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a function to handle removing a leave block assignment
  const removeLeaveBlock = useCallback(async (blockId: string) => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      
      // Find the user_leave_blocks entry
      const { data: userBlockData, error: findError } = await supabase
        .from('user_leave_blocks')
        .select('id')
        .eq('user_id', user.id)
        .eq('leave_block_id', blockId)
        .eq('status', 'active')
        .single();
      
      if (findError) {
        console.error('Error finding leave block assignment:', findError);
        throw new Error('Leave block assignment not found');
      }
      
      if (!userBlockData) {
        throw new Error('Leave block assignment not found');
      }
      
      // Update the status to 'inactive' instead of deleting
      const { error: updateError } = await supabase
        .from('user_leave_blocks')
        .update({ status: 'inactive' })
        .eq('id', userBlockData.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Block Removed",
        description: "Leave block has been removed from your assignments"
      });
      
      // Refresh the leave blocks list
      await fetchLeaveBlocks();
      return true;
    } catch (error) {
      console.error('Error removing leave block:', error);
      toast({
        title: "Error",
        description: "Failed to remove leave block",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchLeaveBlocks]);

  // Other methods remain the same
  const createLeaveSwapRequest = useCallback(async (leaveBlockId: string) => {
    if (!user) return false;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .insert({
          requester_id: user.id,
          requester_leave_block_id: leaveBlockId,
          requested_leave_block_id: null,
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
      
      // Get the current session to get the auth token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session?.access_token) {
        console.error('Session error or missing token:', sessionError);
        toast({
          title: "Authentication Error",
          description: "Please log in again to complete this action",
          variant: "destructive"
        });
        throw new Error('Authentication required');
      }
      
      const accessToken = sessionData.session.access_token;
      
      console.log('Splitting leave block with ID:', blockId);
      console.log('Auth token available:', accessToken ? 'Yes' : 'No');
      
      // Use the admin access token to bypass RLS
      const { data, error } = await supabase.functions.invoke('split_leave_block', {
        body: { 
          user_leave_block_id: blockId, 
          user_id: user.id 
        },
        headers: { 
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (error) {
        console.error('Error from edge function:', error);
        throw new Error(error.message || 'Failed to split leave block');
      }
      
      if (!data || !data.success) {
        console.error('Unexpected response:', data);
        throw new Error(data?.error || 'Failed to split block');
      }
      
      console.log('Split block response:', data);
      
      toast({
        title: "Block Split",
        description: "Your leave block has been split into two equal parts"
      });
      
      await fetchLeaveBlocks();
      return true;
      
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
      
      // Get the current session to get the auth token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Authentication required');
      }
      
      const accessToken = sessionData.session.access_token;
      
      const { data, error } = await supabase.functions.invoke('join_leave_blocks', {
        body: { 
          block_a_id: blockAId, 
          block_b_id: blockBId,
          user_id: user.id 
        },
        headers: { Authorization: `Bearer ${accessToken}` }
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
    } else {
      // Clear leave blocks when user logs out
      setLeaveBlocks([]);
    }
  }, [user, fetchLeaveBlocks]);

  return {
    leaveBlocks,
    isLoading,
    refreshLeaveBlocks: fetchLeaveBlocks,
    createLeaveSwapRequest,
    splitLeaveBlock,
    joinLeaveBlocks,
    removeLeaveBlock
  };
};
