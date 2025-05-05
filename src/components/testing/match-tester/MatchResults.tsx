
import { MatchTestResult } from "./types";
import { SwapMatchCard } from "./SwapMatchCard";
import { Loader2 } from "lucide-react";

interface MatchResultsProps {
  matchResults: MatchTestResult[];
  isCreating: boolean;
  onCreateMatch: (match: MatchTestResult) => void;
  isLoading: boolean;
}

export function MatchResults({ matchResults, isCreating, onCreateMatch, isLoading }: MatchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading...
      </div>
    );
  }
  
  if (matchResults.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No matches found. Try running the test after fetching data.
      </div>
    );
  }
  
  return (
    <div>
      <h3 className="font-semibold text-lg mb-2">Match Results:</h3>
      <div className="space-y-4 mt-4">
        {matchResults.map((match, index) => (
          <SwapMatchCard
            key={`${match.request1Id}-${match.request2Id}`}
            match={match}
            index={index}
            isCreating={isCreating}
            onCreateMatch={onCreateMatch}
          />
        ))}
      </div>
    </div>
  );
}
