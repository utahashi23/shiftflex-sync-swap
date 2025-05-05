
import { SwapMatch } from "./types";
import { SwapCard } from "./SwapCard";
import { EmptySwapState } from "./EmptySwapState";

interface SwapTabContentProps {
  swaps: SwapMatch[];
  isPast?: boolean;
  onAcceptSwap?: (matchId: string) => void;
}

export const SwapTabContent = ({ swaps, isPast = false, onAcceptSwap }: SwapTabContentProps) => {
  // Detailed logging of swaps data including colleague types
  console.log(`SwapTabContent: Rendering ${swaps?.length || 0} ${isPast ? 'past' : 'active'} swaps`);
  
  if (swaps && swaps.length > 0) {
    // Log the colleague types of all swaps for debugging
    swaps.forEach((swap, index) => {
      console.log(`Swap ${index} (ID: ${swap.id}) colleague types:`, {
        myShift: swap.myShift?.colleagueType,
        otherShift: swap.otherShift?.colleagueType
      });
    });
  }

  if (!swaps || swaps.length === 0) {
    return (
      <EmptySwapState 
        message={isPast ? "No Past Swaps" : "No Matched Swaps"} 
        subtitle={isPast ? "You don't have any completed swaps yet." : "You don't have any matched swap requests yet."}
      />
    );
  }

  // We ensure uniqueness by ID when displaying swaps
  const uniqueSwapsMap = new Map<string, SwapMatch>();
  
  // Only add items to the map if they're actually SwapMatch objects
  swaps.forEach(swap => {
    if (swap && typeof swap === 'object' && 'id' in swap) {
      uniqueSwapsMap.set(swap.id, swap);
    }
  });
  
  const uniqueSwaps = Array.from(uniqueSwapsMap.values());
  
  console.log(`SwapTabContent: Displaying ${uniqueSwaps.length} unique swaps`);

  return (
    <div className="space-y-4" data-testid="swap-list">
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
