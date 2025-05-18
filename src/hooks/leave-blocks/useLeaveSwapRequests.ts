
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { LeaveSwapRequest } from '@/types/leave-blocks';

export const useLeaveSwapRequests = () => {
  const [requests, setRequests] = useState<LeaveSwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Use explicit field selection with table aliases to avoid relationship errors
      const { data, error } = await supabase
        .from('leave_swap_requests')
        .select(`
          id,
          requester_id,
          requester_leave_block_id,
          requested_leave_block_id,
          status,
          created_at,
          leave_blocks!requester_leave_block_id (
            id,
            block_number,
            start_date,
            end_date,
            status,
            created_at,
            split_designation,
            original_block_id
          )
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      if (data) {
        // Transform the data to match our LeaveSwapRequest type
        const transformedData: LeaveSwapRequest[] = data.map(item => ({
          id: item.id,
          requester_id: item.requester_id,
          requester_leave_block_id: item.requester_leave_block_id,
          requested_leave_block_id: item.requested_leave_block_id,
          status: item.status,
          created_at: item.created_at,
          requester_leave_block: item.leave_blocks ? {
            id: item.leave_blocks.id,
            block_number: item.leave_blocks.block_number,
            start_date: item.leave_blocks.start_date,
            end_date: item.leave_blocks.end_date,
            status: item.leave_blocks.status,
            created_at: item.leave_blocks.created_at,
            split_designation: item.leave_blocks.split_designation as 'A' | 'B' | null | undefined,
            original_block_id: item.leave_blocks.original_block_id
          } : undefined
        }));
        
        setRequests(transformedData);
      }
    } catch (error) {
      console.error('Error fetching leave swap requests:', error);
      toast({
        title: "Error",
        description: "Failed to load leave swap requests",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const cancelRequest = useCallback(async (requestId: string) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('leave_swap_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('requester_id', user?.id);
      
      if (error) throw error;
      
      // Update local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Request Cancelled",
        description: "Your leave swap request has been cancelled"
      });
      
      return true;
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel leave swap request",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load requests on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  return {
    requests,
    isLoading,
    refreshRequests: fetchRequests,
    cancelRequest
  };
};
