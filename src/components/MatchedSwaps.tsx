
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSimpleSwapMatches } from "@/hooks/swap-matches/useSimpleSwapMatches";
import { useSimpleMatcher } from "@/hooks/swap-matching/useSwapMatcher/useSimpleMatcher";
import MatchCard from "@/components/swaps/MatchCard";
import MatchCardSkeleton from "@/components/swaps/MatchCardSkeleton";
import { DebugPanel } from "@/components/matched-swaps/DebugPanel";

interface MatchedSwapsProps {
  setRefreshTrigger?: (refreshTrigger: number) => void;
}

const MatchedSwaps = ({ setRefreshTrigger }: MatchedSwapsProps) => {
  const { user, isAdmin } = useAuth();
  const { matches, pastMatches, isLoading, error, fetchMatches, acceptMatch, completeMatch, rawApiData } = useSimpleSwapMatches();
  const { findSwapMatches, isProcessing } = useSimpleMatcher();
  const [debugEnabled, setDebugEnabled] = useState(false);
  
  // Log component state for debugging
  useEffect(() => {
    console.info("Matched swaps component:", {
      matchCount: matches.length,
      pastMatchCount: pastMatches.length,
      isLoading,
      hasError: !!error
    });
  }, [matches.length, pastMatches.length, isLoading, error]);
  
  const handleFindMatches = async () => {
    if (!user) return;
    
    try {
      toast({
        title: "Finding matches...",
        description: "Checking for potential shift swaps"
      });
      
      // Use the simple matcher to find matches directly
      await findSwapMatches(true);
      
      // Refresh match data after finding matches
      await fetchMatches();
      
      // Also trigger parent refresh if provided
      if (setRefreshTrigger) {
        setRefreshTrigger(Date.now());
      }
      
    } catch (error) {
      console.error("Error finding matches:", error);
      toast({
        title: "Error finding matches",
        description: "There was a problem finding potential matches",
        variant: "destructive"
      });
    }
  };
  
  const handleAcceptMatch = async (matchId: string) => {
    const success = await acceptMatch(matchId);
    if (success && setRefreshTrigger) {
      setRefreshTrigger(Date.now());
    }
  };
  
  const handleCompleteMatch = async (matchId: string) => {
    const success = await completeMatch(matchId);
    if (success && setRefreshTrigger) {
      setRefreshTrigger(Date.now());
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug button for admins */}
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDebugEnabled(!debugEnabled)}
            className="text-xs"
          >
            {debugEnabled ? "Hide Debug" : "Show Debug"}
          </Button>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Matched Swaps {isAdmin && <span className="text-sm text-blue-500">(Admin)</span>}
        </h2>
        <Button
          onClick={handleFindMatches}
          disabled={isProcessing || isLoading}
        >
          {(isProcessing || isLoading) ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Finding Matches...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Find Matches
            </>
          )}
        </Button>
      </div>
      
      {/* Debug panel for admins */}
      {isAdmin && debugEnabled && (
        <DebugPanel
          matches={matches}
          rawData={rawApiData}
          error={error}
          onRefresh={fetchMatches}
          isLoading={isLoading}
        />
      )}
      
      {/* Active matches */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Active Matches</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No matches found</p>
              <p className="text-sm mt-1">
                Use the "Find Matches" button to look for new potential swaps
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <MatchCard 
                  key={match.id}
                  match={match}
                  onAccept={handleAcceptMatch}
                  onComplete={handleCompleteMatch}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Past matches */}
      {pastMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Past Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastMatches.map((match) => (
                <MatchCard 
                  key={match.id}
                  match={match}
                  isPast={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MatchedSwaps;
