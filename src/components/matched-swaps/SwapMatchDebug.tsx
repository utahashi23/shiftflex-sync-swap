
import { useSwapMatcher } from '@/hooks/swap-matching';
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
      toast({
        title: "Finding matches",
        description: "Looking for potential shift swap matches...",
      });
      
      // Run the match finder with verbose logging
      const result = await findSwapMatches(user.id, true, true);
      
      console.log("Match find result:", result);
      
      if (result.success) {
        toast({
          title: `Found ${result.matches?.length || 0} matches`,
          description: "Check the console for detailed matching logs.",
        });
      } else {
        toast({
          title: "No matches found",
          description: result.message || "Could not find any potential matches.",
          variant: "destructive"
        });
      }
      
      // After finding matches, trigger parent refresh if provided
      if (onRefreshMatches) {
        console.log("Triggering parent refresh after finding matches");
        onRefreshMatches();
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
          <div className="flex flex-col space-y-4">
            <h3 className="font-medium text-amber-900">Swap Match Testing</h3>
            <p className="text-sm text-amber-800">
              Run this to find potential swap matches based on mutual dates only.
              Check the console for detailed logs.
            </p>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
