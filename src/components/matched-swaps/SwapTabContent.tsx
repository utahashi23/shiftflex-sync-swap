
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

  // Create a uniqueID to swap object map
  const uniqueSwapsMap = new Map();
  
  // Use Set to track already seen swap IDs
  swaps.forEach(swap => {
    if (!uniqueSwapsMap.has(swap.id)) {
      uniqueSwapsMap.set(swap.id, swap);
    }
  });
  
  // Convert map values back to array
  const uniqueSwaps = Array.from(uniqueSwapsMap.values());

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
