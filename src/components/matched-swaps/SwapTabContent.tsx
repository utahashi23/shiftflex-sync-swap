
import { MatchedSwap } from "./types";
import { SwapCard } from "./SwapCard";
import { EmptySwapState } from "./EmptySwapState";

interface SwapTabContentProps {
  swaps: MatchedSwap[];
  isPast?: boolean;
  onAcceptSwap?: (swapId: string) => void;
}

export const SwapTabContent = ({ swaps, isPast = false, onAcceptSwap }: SwapTabContentProps) => {
  if (!swaps || swaps.length === 0) {
    return (
      <EmptySwapState 
        message={isPast ? "No Past Swaps" : "No Matched Swaps"} 
        subtitle={isPast ? "You don't have any completed swaps yet." : "You don't have any matched swap requests yet."}
      />
    );
  }

  // Make sure we display each swap only once (by ID)
  const uniqueSwaps = swaps.reduce((acc: MatchedSwap[], swap) => {
    if (!acc.some(s => s.id === swap.id)) {
      acc.push(swap);
    }
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      {uniqueSwaps.map(swap => (
        <SwapCard 
          key={swap.id}
          swap={swap} 
          isPast={isPast}
          onAccept={onAcceptSwap}
        />
      ))}
    </div>
  );
};
