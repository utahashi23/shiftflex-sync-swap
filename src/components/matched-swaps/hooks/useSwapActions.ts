
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MatchedSwap } from '../types';

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
    onSuccess: (completedSwap: MatchedSwap) => void
  ) => {
    if (!swapId) return;
    
    setIsLoading(true);
    
    try {
      // Update swap request status in database
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status: 'completed' })
        .eq('id', swapId);
        
      if (error) throw error;
      
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
