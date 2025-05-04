
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SwapMatchDebugProps {
  onRefreshMatches?: () => void;
}

export function SwapMatchDebug({ onRefreshMatches }: SwapMatchDebugProps) {
  const { user } = useAuth();
  const { findSwapMatches, isProcessing } = useSwapMatcher();

  const runFindMatches = async () => {
    try {
      // Call findSwapMatches with the current user ID, verbose and user perspective only
      // We explicitly set userInitiatorOnly to true to prevent showing duplicated matches
      const result = await findSwapMatches(user?.id, true, true, true, true);
      console.log("Match find result:", result);
      
      // After finding matches, trigger parent refresh if provided
      if (onRefreshMatches) {
        console.log("Triggering parent refresh after finding matches");
        onRefreshMatches();
      }
    } catch (error) {
      console.error("Error during match find:", error);
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
