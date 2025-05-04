
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface SwapMatchDebugProps {
  onRefreshMatches?: () => void;
}

export function SwapMatchDebug({ onRefreshMatches }: SwapMatchDebugProps) {
  const { user } = useAuth();
  const { findSwapMatches, isProcessing } = useSwapMatcher();

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
      // Always set userInitiatorOnly to true to ensure the current user's request is always the requester
      // This ensures "Your Shift" is always the shift the user is trying to swap
      const result = await findSwapMatches(user.id, true, true, true, true);
      console.log("Match find result:", result);
      
      // After finding matches, trigger parent refresh if provided
      if (onRefreshMatches) {
        console.log("Triggering parent refresh after finding matches");
        onRefreshMatches();
      }
      
      // Show toast about results
      if (result && Array.isArray(result) && result.length > 0) {
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
    <div className="mb-4">
      <Card className="border border-amber-300 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
