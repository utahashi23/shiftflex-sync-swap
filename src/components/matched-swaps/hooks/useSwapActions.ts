
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapMatch } from '../types';

/**
 * Hook for swap action handlers (accept, cancel)
 */
export const useSwapActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * Accept a swap and update its status to completed
   */
  const handleAcceptSwap = async (
    swapId: string, 
    onSuccess: (completedSwap: SwapMatch) => void
  ) => {
    if (!swapId) return false;
    
    setIsLoading(true);
    
    try {
      // Call the accept_swap_match function
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: swapId }
      });
        
      if (error) throw error;
      
      // Important: We don't change any UI state here, just process the response
      console.log('Accept swap response:', data);
      
      // If we have a callback, call it with the updated swap data
      // This ensures the UI can be properly updated without removing the swap
      if (typeof onSuccess === 'function') {
        // Create a properly typed SwapMatch object with all required fields
        // Get some details from response if available, otherwise use placeholders
        const matchDetails = data?.data || {};
        
        onSuccess({
          id: swapId,
          status: 'accepted',
          myShift: { 
            id: matchDetails.requester_shift_id || '', 
            date: '', 
            startTime: '', 
            endTime: '', 
            type: 'unknown', 
            colleagueType: '' 
          },
          otherShift: { 
            id: matchDetails.acceptor_shift_id || '', 
            date: '', 
            startTime: '', 
            endTime: '', 
            type: 'unknown', 
            colleagueType: '',
            userId: '',
            userName: 'User'
          },
          // Add the missing required properties
          myRequestId: matchDetails.requester_request_id || '',
          otherRequestId: matchDetails.acceptor_request_id || '',
          createdAt: new Date().toISOString()
        });
      }
      
      toast({
        title: "Swap Accepted",
        description: "The shift swap has been successfully accepted.",
      });
      
      return true;
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleAcceptSwap,
    isLoading
  };
};
