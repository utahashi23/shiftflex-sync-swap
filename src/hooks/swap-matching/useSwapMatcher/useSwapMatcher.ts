
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../useAuth';
import { toast } from '../../use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProcessState } from './useProcessState';
import { useFindSwapMatches } from './useFindSwapMatches';
import { resendSwapNotification } from '@/utils/emailService';

export const useSwapMatcher = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const { findSwapMatches, isLoading: isMatchesFinding } = useFindSwapMatches();
  const { isProcessing, setIsProcessing } = useProcessState();
  
  // Add missing state values that were expected from useProcessState
  const [stage, setStage] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [potentialMatches, setMatches] = useState<any[]>([]);
  
  // Reset function for state
  const resetState = useCallback(() => {
    setStage('');
    setMessage('');
    setError(null);
    setMatches([]);
  }, []);
  
  // Reset the process state when the component unmounts or when user changes
  useEffect(() => {
    setIsInitialized(true);
    return () => {
      resetState();
    };
  }, [user?.id, resetState]);

  // Function to find swap matches
  const processSwapMatches = useCallback(async (userId?: string) => {
    if (!user && !userId) {
      console.error('User not logged in');
      setError('User not logged in');
      return { success: false, error: 'User not logged in' };
    }
    
    try {
      // Fix: Call findSwapMatches with userId or user?.id (removing extra arguments)
      const result = await findSwapMatches(userId || user?.id);
      
      if (!result.success) {
        console.error('Failed to find matches:', result.error);
        setError(result.error || 'Failed to find matches');
        return result;
      }
      
      // Fix: Access allRequests instead of requests
      if (result.allRequests && Array.isArray(result.allRequests)) {
        console.log(`Found ${result.allRequests.length} requests`);
      }
      
      // Fix: Make sure matches exist before accessing
      setMatches(result.matches || []);
      setMessage(`Found ${result.matches?.length || 0} potential swap matches`);
      return { success: true, matches: result.matches };
      
    } catch (err: any) {
      console.error('Error in processSwapMatches:', err);
      setError(err.message || 'Failed to process swap matches');
      return { success: false, error: err.message };
    }
  }, [user, findSwapMatches, setError, setMatches, setMessage]);
  
  // Accept a swap match
  const acceptSwapMatch = useCallback(async (matchId: string) => {
    if (!user) {
      console.error('User not logged in');
      return { success: false, error: 'User not logged in' };
    }
    
    try {
      // Call the edge function to accept the swap match
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) {
        console.error('Failed to accept swap match:', error);
        toast({
          title: "Failed to Accept Swap",
          description: error.message || 'An error occurred while accepting the swap',
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }
      
      toast({
        title: "Swap Accepted",
        description: "The shift swap has been accepted. Please check your email for confirmation.",
      });
      
      // Remove the client-side email sending to avoid duplication
      // The edge function already handles sending emails
      
      return { success: true, data };
      
    } catch (err: any) {
      console.error('Error in acceptSwapMatch:', err);
      toast({
        title: "Error",
        description: err.message || 'An error occurred',
        variant: "destructive"
      });
      return { success: false, error: err.message };
    }
  }, [user]);
  
  // Cancel a swap match
  const cancelSwapMatch = useCallback(async (matchId: string) => {
    if (!user) {
      console.error('User not logged in');
      return { success: false, error: 'User not logged in' };
    }
    
    try {
      // Call the edge function to cancel the swap match
      const { data, error } = await supabase.functions.invoke('cancel_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) {
        console.error('Failed to cancel swap match:', error);
        toast({
          title: "Failed to Cancel Swap",
          description: error.message || 'An error occurred while canceling the swap',
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }
      
      toast({
        title: "Swap Canceled",
        description: "The shift swap has been successfully canceled",
      });
      
      return { success: true, data };
      
    } catch (err: any) {
      console.error('Error in cancelSwapMatch:', err);
      toast({
        title: "Error",
        description: err.message || 'An error occurred',
        variant: "destructive"
      });
      return { success: false, error: err.message };
    }
  }, [user]);
  
  // Finalize a swap match
  const finalizeSwapMatch = useCallback(async (matchId: string) => {
    if (!user) {
      console.error('User not logged in');
      return { success: false, error: 'User not logged in' };
    }
    
    try {
      // Call the edge function to finalize the swap match
      const { data, error } = await supabase.functions.invoke('finalize_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) {
        console.error('Failed to finalize swap match:', error);
        toast({
          title: "Failed to Finalize Swap",
          description: error.message || 'An error occurred while finalizing the swap',
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }
      
      toast({
        title: "Swap Finalized",
        description: "The shift swap has been finalized. Calendars have been updated.",
      });
      
      // Remove the client-side email sending to avoid duplication
      // The edge function already handles sending emails
      
      return { success: true, data };
      
    } catch (err: any) {
      console.error('Error in finalizeSwapMatch:', err);
      toast({
        title: "Error",
        description: err.message || 'An error occurred',
        variant: "destructive"
      });
      return { success: false, error: err.message };
    }
  }, [user]);

  return {
    isInitialized,
    isLoading: isMatchesFinding,
    isProcessing,
    stage,
    message,
    error,
    potentialMatches,
    processSwapMatches,
    acceptSwapMatch,
    cancelSwapMatch,
    finalizeSwapMatch,
    resetState,
  };
};
