import { SwapMatch } from "@/hooks/useSwapMatches";
import { SwapCard } from "./SwapCard";
import { EmptySwapState } from "./EmptySwapState";

interface SwapTabContentProps {
  swaps: SwapMatch[];
  isPast?: boolean;
  onAcceptSwap?: (matchId: string) => void;
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

  // Create a Set to track seen match IDs
  const uniqueMatchIds = new Set<string>();
  
  // Filter to keep only unique swaps
  const uniqueSwaps = swaps.filter(swap => {
    if (uniqueMatchIds.has(swap.id)) {
      return false;
    }
    uniqueMatchIds.add(swap.id);
    return true;
  });

  console.log(`Displaying ${uniqueSwaps.length} unique swaps from ${swaps.length} total swaps`);

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
