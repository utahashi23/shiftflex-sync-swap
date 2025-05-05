
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { createSwapMatchSafe } from '@/utils/rls-helpers';
import { MatchTestResult } from './types';

export const useCreateMatch = (onMatchCreated?: () => void, refreshData?: () => void) => {
  const [isCreating, setIsCreating] = useState(false);

  const createMatch = async (match: MatchTestResult) => {
    if (!match.request1Id || !match.request2Id) {
      toast({
        title: "Invalid match",
        description: "Missing request information",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      console.log(`Creating match between requests ${match.request1Id} and ${match.request2Id}`);
      
      // Create the match using our safe helper function
      const { data, error } = await createSwapMatchSafe(match.request1Id, match.request2Id);
      
      if (error) {
        throw error;
      }
      
      console.log("Match created successfully:", data);
      
      toast({
        title: "Match created",
        description: "The swap match has been created successfully."
      });
      
      // Call callbacks if provided
      if (onMatchCreated) onMatchCreated();
      if (refreshData) refreshData();
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error creating match",
        description: "Failed to create the swap match. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createMatch,
    isCreating
  };
};
