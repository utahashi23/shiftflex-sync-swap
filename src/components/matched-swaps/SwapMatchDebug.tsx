
import { useState } from 'react';
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AllMatchesDebug from './AllMatchesDebug';

interface SwapMatchDebugProps {
  onRefreshMatches?: () => void;  // Added prop for refreshing parent components
}

export function SwapMatchDebug({ onRefreshMatches }: SwapMatchDebugProps) {
  const { user } = useAuth();
  const { findSwapMatches, isProcessing } = useSwapMatcher();
  const [debugMode, setDebugMode] = useState(false);

  const runDebugMatchFind = async () => {
    await findSwapMatches(user?.id, true, true);
    // After finding matches, trigger parent refresh if provided
    if (onRefreshMatches) {
      onRefreshMatches();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-amber-300 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-800 text-lg">Debug Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700 mb-4">
            This section contains tools for testing and debugging the shift swap matching system.
          </p>
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button
              disabled={isProcessing}
              variant="secondary"
              onClick={runDebugMatchFind}
              className="bg-amber-200 hover:bg-amber-300 text-amber-900"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Find Matches
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setDebugMode(!debugMode)}
            >
              {debugMode ? 'Hide' : 'Show'} Full Debug View
            </Button>
          </div>
          
          {debugMode && (
            <div className="mt-4">
              <AllMatchesDebug />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
