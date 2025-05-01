
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
    if (!swapId) return;
    
    setIsLoading(true);
    
    try {
      // Call the accept_swap_match function
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: swapId }
      });
        
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
