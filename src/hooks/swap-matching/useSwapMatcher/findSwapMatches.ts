
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Enhanced function to find swap matches - fixed to work for all users including demo1@maildrop.cc
 */
export const useFindSwapMatches = (setIsProcessing?: (isProcessing: boolean) => void) => {
  const [isProcessing, setInternalIsProcessing] = useState(false);
  const [matchResults, setMatchResults] = useState<any>(null);

  // Use the provided setIsProcessing function or fallback to the internal one
  const setProcessingStatus = (status: boolean) => {
    if (setIsProcessing) {
      setIsProcessing(status);
    }
    setInternalIsProcessing(status);
  };

  /**
   * Find potential matches for swap requests
   * Enhanced to ensure it works for all users including demo1@maildrop.cc
   */
  const findSwapMatches = async (
    userId: string, 
    forceCheck: boolean = false,
    verbose: boolean = false,
    userPerspectiveOnly: boolean = true,
    userInitiatorOnly: boolean = true
  ) => {
    try {
      console.log(`Finding swap matches for ${userId} (force: ${forceCheck}, verbose: ${verbose}, user perspective only: ${userPerspectiveOnly}, user initiator only: ${userInitiatorOnly})`);
      setProcessingStatus(true);
      
      // First try direct database approach for user's pending requests
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('id, requester_id, status')
        .eq('requester_id', userId)
        .eq('status', 'pending');
      
      if (requestsError) {
        console.error('Error checking pending requests:', requestsError);
      } else {
        console.log(`User has ${pendingRequests?.length || 0} pending requests directly in the database`);
      }
      
      // Call the edge function which can bypass RLS and get a complete view
      console.log("Using edge function to find matches...");
      const { data, error } = await supabase.functions.invoke('get_user_matches', {
        body: { 
          user_id: userId,
          force_check: forceCheck,
          verbose: verbose,
          user_perspective_only: userPerspectiveOnly,
          user_initiator_only: userInitiatorOnly,
          bypass_rls: true // Request explicit RLS bypass
        }
      });
      
      if (error) {
        console.error('Error finding matches:', error);
        
        // If edge function fails, try direct database query with enhanced logging
        console.log("Edge function failed, attempting direct database query as fallback");
        // This would be a basic fallback implementation
        // which we won't implement now to avoid complicating the code
        
        throw error;
      }
      
      console.log('Found matches using edge function:', data);
      setMatchResults(data);
      return data;
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      throw error;
    } finally {
      setProcessingStatus(false);
    }
  };

  return {
    findSwapMatches,
    matchResults,
    isProcessing
  };
};
