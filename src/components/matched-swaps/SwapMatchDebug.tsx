
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function SwapMatchDebug() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { findSwapMatches, isProcessing } = useSwapMatcher();
  
  const handleFindMatches = async () => {
    try {
      await findSwapMatches(undefined, true);
      toast({
        title: "Match finding complete",
        description: "The system has searched for potential swap matches."
      });
    } catch (error) {
      console.error('Error finding matches:', error);
      toast({
        title: "Error finding matches",
        description: "There was a problem looking for matches.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="mb-6">
      {isExpanded ? (
        <Card>
          <CardHeader className="bg-muted/50 pb-3">
            <CardTitle className="text-sm font-medium flex justify-between">
              <span>Debug Tools</span>
              <span 
                className="text-xs cursor-pointer text-muted-foreground hover:text-primary"
                onClick={() => setIsExpanded(false)}
              >
                Hide
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Swap Matching</h4>
              <Button 
                onClick={handleFindMatches}
                disabled={isProcessing}
                className="text-xs h-8"
                variant="outline"
              >
                {isProcessing ? 'Processing...' : 'Find All Possible Matches'}
              </Button>
              <p className="text-xs text-muted-foreground">
                This will search for all potential swap matches regardless of existing matches.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end mb-2">
          <Button 
            onClick={() => setIsExpanded(true)} 
            variant="ghost" 
            size="sm"
            className="text-xs"
          >
            Show Debug Tools
          </Button>
        </div>
      )}
    </div>
  );
}
