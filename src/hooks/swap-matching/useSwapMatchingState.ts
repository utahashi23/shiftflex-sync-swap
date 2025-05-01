
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { fetchSwapMatchingData } from '@/utils/swap-matching';

export const useSwapMatchingState = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  
  const checkUserAuthStatus = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleSwapMatchingStart = async () => {
    if (!checkUserAuthStatus()) return null;
    
    setIsProcessing(true);
    console.log('----------- SWAP MATCHING STARTED -----------');
    console.log('Current user ID:', user?.id);
    
    const result = await fetchSwapMatchingData();
    
    if (!result.success) {
      toast({
        title: result.message || "Error",
        description: result.error?.message || "There was a problem fetching swap data.",
        variant: result.error ? "destructive" : "default"
      });
      setIsProcessing(false);
      return null;
    }
    
    return {
      ...result.data,
      userId: user?.id
    };
  };

  const handleSwapMatchingComplete = (matchesFound: number) => {
    console.log(`Matching complete. Found ${matchesFound} matches.`);
    
    if (matchesFound === 0) {
      toast({
        title: "No matches found",
        description: "No suitable matches found between any of the swap requests.",
      });
    } else {
      toast({
        title: "Matching Complete",
        description: `Found ${matchesFound} swap matches.`,
      });
    }
    
    setIsProcessing(false);
    console.log('----------- SWAP MATCHING COMPLETED -----------');
  };

  const handleSwapMatchingError = (error: any) => {
    console.error('Error finding swap matches:', error);
    toast({
      title: "Error finding matches",
      description: error.message || "There was a problem finding swap matches.",
      variant: "destructive"
    });
    setIsProcessing(false);
    console.log('----------- SWAP MATCHING FAILED -----------');
  };

  return {
    isProcessing,
    setIsProcessing,
    handleSwapMatchingStart,
    handleSwapMatchingComplete,
    handleSwapMatchingError,
    userId: user?.id
  };
};
