
import { SwapMatch } from "./types";
import { SwapCard } from "./SwapCard";
import { EmptySwapState } from "./EmptySwapState";

interface SwapTabContentProps {
  swaps: SwapMatch[];
  isPast?: boolean;
  onAcceptSwap?: (matchId: string) => void;
  onFinalizeSwap?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
}

export const SwapTabContent = ({ 
  swaps, 
  isPast = false, 
  onAcceptSwap, 
  onFinalizeSwap,
  onResendEmail
}: SwapTabContentProps) => {
  // Log the received swaps
  console.log(`SwapTabContent: Rendering ${swaps?.length || 0} ${isPast ? 'past' : 'active'} swaps`);
  
  if (!swaps || swaps.length === 0) {
    return (
      <EmptySwapState 
        message={isPast ? "No Past Swaps" : "No Matched Swaps"} 
        subtitle={isPast ? "You don't have any completed swaps yet." : "You don't have any matched swap requests yet."}
      />
    );
  }

  // Log detailed information about all swaps
  swaps.forEach((swap, index) => {
    console.log(`Swap ${index} (ID: ${swap.id}, Status: ${swap.status}) colleague types:`, {
      myShift: swap.myShift?.colleagueType,
      otherShift: swap.otherShift?.colleagueType,
      myRequestId: swap.myRequestId,
      otherRequestId: swap.otherRequestId
    });
  });

  // Ensure uniqueness by ID
  const uniqueSwapsMap = new Map<string, SwapMatch>();
  
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
          onFinalize={onFinalizeSwap}
          onResendEmail={onResendEmail}
          isAcceptedByOthers={swap.status === 'accepted' && 
            (swap.myShift?.userId === "96fc40f8-ceec-4ab2-80a6-3bd9fbf1cdd5" || 
             swap.otherShift?.userId === "96fc40f8-ceec-4ab2-80a6-3bd9fbf1cdd5")}
        />
      ))}
    </div>
  );
}
