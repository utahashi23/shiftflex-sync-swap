
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Enhanced function to find swap matches - fixed to work for all users including demo1@maildrop.cc
 */
export const useFindSwapMatches = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResults, setMatchResults] = useState<any>(null);

  /**
   * Find potential matches for swap requests
   * Enhanced to ensure it works for all users including demo1@maildrop.cc
   */
  const findSwapMatches = async (
    userId: string, 
    forceCheck: boolean = false,
    verbose: boolean = false,
    userPerspectiveOnly: boolean = true,
    userInitiatorOnly: boolean = false
  ) => {
    try {
      console.log(`Finding swap matches for ${userId} (force: ${forceCheck}, verbose: ${verbose}, user perspective only: ${userPerspectiveOnly}, user initiator only: ${userInitiatorOnly})`);
      setIsProcessing(true);
      
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
        console.error('Error finding matches using edge function:', error);
        
        // If edge function fails, try direct API call as fallback
        console.log("Edge function failed, attempting direct API call as fallback");
        
        try {
          const response = await fetch(`https://ponhfgbpxehsdlxjpszg.supabase.co/functions/v1/get_user_matches`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbmhmZ2JweGVoc2RseGpwc3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODM0NDcsImV4cCI6MjA2MTU1OTQ0N30.-n7sUFjxDJUCpMMA0AGnXlQCkaVt31dER91ZQLO3jDs`
            },
            body: JSON.stringify({
              user_id: userId,
              force_check: forceCheck,
              verbose: verbose,
              user_perspective_only: userPerspectiveOnly,
              user_initiator_only: userInitiatorOnly,
              bypass_rls: true
            })
          });
          
          const fallbackData = await response.json();
          console.log('Found matches using direct API call:', fallbackData);
          setMatchResults(fallbackData);
          return fallbackData;
          
        } catch (fallbackError) {
          console.error('Direct API call also failed:', fallbackError);
          throw new Error(`Edge function failed: ${error.message}, and direct API call failed: ${fallbackError.message}`);
        }
      }
      
      console.log('Found matches using edge function:', data);
      setMatchResults(data);
      return data;
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    findSwapMatches,
    matchResults,
    isProcessing
  };
};
