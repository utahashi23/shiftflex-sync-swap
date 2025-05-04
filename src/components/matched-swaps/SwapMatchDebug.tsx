
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface SwapMatchDebugProps {
  onRefreshMatches?: () => void;
}

export function SwapMatchDebug({ onRefreshMatches }: SwapMatchDebugProps) {
  const { user } = useAuth();
  const { findSwapMatches, isProcessing } = useSwapMatcher();
  const [hasResultData, setHasResultData] = useState(false);

  const runFindMatches = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Using the simple match algorithm now for quicker user feedback
      const result = await findSwapMatches(
        user.id, 
        true, // forceCheck: true
        true, // verbose: true
        true, // userPerspectiveOnly: true
        true  // userInitiatorOnly: true
      );
      
      console.log("Match find result:", result);
      
      // Check if we have actual results before triggering a refresh
      const hasResults = result && Array.isArray(result) && result.length > 0;
      setHasResultData(hasResults);
      
      // After finding matches, trigger parent refresh if provided and we have results
      if (onRefreshMatches && typeof onRefreshMatches === 'function' && hasResults) {
        console.log("Triggering parent refresh after finding matches");
        setTimeout(() => {
          onRefreshMatches();
        }, 300); // Increased delay to ensure state updates complete
      }
      
      // Show toast about results
      if (hasResults) {
        toast({
          title: "Matches found!",
          description: `Found ${result.length} potential swap matches.`,
        });
      } else {
        toast({
          title: "No matches found",
          description: "No potential swap matches were found at this time.",
        });
      }
    } catch (error) {
      console.error("Error during match find:", error);
      toast({
        title: "Error finding matches",
        description: "There was a problem finding potential matches.",
        variant: "destructive"
      });
    }
  };

  return (
    <div>
      <Button
        disabled={isProcessing}
        variant="secondary"
        onClick={runFindMatches}
        className="bg-amber-200 hover:bg-amber-300 text-amber-900"
      >
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Find Potential Matches
      </Button>
    </div>
  );
}
