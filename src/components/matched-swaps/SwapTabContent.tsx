
import { SwapMatch } from "@/hooks/useSwapMatches";
import { SwapCard } from "./SwapCard";
import { EmptySwapState } from "./EmptySwapState";

interface SwapTabContentProps {
  swaps: SwapMatch[];
  isPast?: boolean;
  onAcceptSwap?: (matchId: string) => void;
}

export const SwapTabContent = ({ swaps, isPast = false, onAcceptSwap }: SwapTabContentProps) => {
  // Add debugging to see what's being passed to the component
  console.log(`SwapTabContent received ${swaps?.length || 0} swaps, isPast: ${isPast}`);
  
  if (!swaps || swaps.length === 0) {
    console.log("No swaps to display, showing empty state");
    return (
      <EmptySwapState 
        message={isPast ? "No Past Swaps" : "No Matched Swaps"} 
        subtitle={isPast ? "You don't have any completed swaps yet." : "You don't have any matched swap requests yet."}
      />
    );
  }

  // We ensure uniqueness by ID when displaying swaps
  const uniqueSwaps = Array.from(
    new Map(swaps.map(swap => [swap.id, swap])).values()
  );
  
  console.log(`Rendering ${uniqueSwaps.length} unique swaps`);

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
