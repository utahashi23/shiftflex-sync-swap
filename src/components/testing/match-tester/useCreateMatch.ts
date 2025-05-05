
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createSwapMatchSafe } from '@/utils/rls-helpers';
import { toast } from '@/hooks/use-toast';
import { MatchTestResult } from './types';

export const useCreateMatch = (onMatchCreated?: () => void, refetchData?: () => void) => {
  const [isCreating, setIsCreating] = useState(false);

  // Create a match in the database for a successful match
  const createMatch = async (match: MatchTestResult) => {
    try {
      setIsCreating(true);
      
      // First, check if this match already exists
      const { data: existingMatches, error: checkError } = await supabase
        .from('shift_swap_potential_matches')
        .select('id')
        .or(`and(requester_request_id.eq.${match.request1Id},acceptor_request_id.eq.${match.request2Id}),and(requester_request_id.eq.${match.request2Id},acceptor_request_id.eq.${match.request1Id})`)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (existingMatches && existingMatches.length > 0) {
        toast({
          title: "Match already exists",
          description: `This match is already in the database with ID: ${existingMatches[0].id}`,
          variant: "default"
        });
        return;
      }
      
      console.log("Creating match between requests:", match.request1Id, match.request2Id);
      
      // Use the helper function to create the match
      const { data, error } = await createSwapMatchSafe(match.request1Id, match.request2Id);
      
      if (error) throw error;
      
      toast({
        title: "Match created successfully",
        description: `Created match with ID: ${data?.[0].id || 'unknown'}`,
        variant: "default"
      });
      
      // Update request statuses to 'matched'
      await Promise.all([
        supabase
          .from('shift_swap_requests')
          .update({ status: 'matched' })
          .eq('id', match.request1Id),
        supabase
          .from('shift_swap_requests')
          .update({ status: 'matched' })
          .eq('id', match.request2Id)
      ]);
      
      // Call the callback if provided
      if (onMatchCreated) {
        onMatchCreated();
      }
      
      // Refresh data after creating match
      if (refetchData) {
        await refetchData();
      }
    } catch (error) {
      console.error('Error creating match:', error);
      toast({
        title: "Error creating match",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return { createMatch, isCreating };
};
