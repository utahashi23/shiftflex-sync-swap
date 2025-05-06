
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
  // Detailed logging of swaps data including statuses and counts
  console.log(`SwapTabContent: Rendering ${swaps?.length || 0} ${isPast ? 'past' : 'active'} swaps`);
  
  if (!swaps || swaps.length === 0) {
    return (
      <EmptySwapState 
        message={isPast ? "No Past Swaps" : "No Matched Swaps"} 
        subtitle={isPast ? "You don't have any completed swaps yet." : "You don't have any matched swap requests yet."}
      />
    );
  }

  // Log count by status for debugging
  const pendingCount = swaps.filter(swap => swap.status === 'pending').length;
  const acceptedCount = swaps.filter(swap => swap.status === 'accepted').length;
  const otherAcceptedCount = swaps.filter(swap => swap.status === 'otherAccepted').length;
  
  console.log(`SwapTabContent status counts - Pending: ${pendingCount}, Accepted: ${acceptedCount}, OtherAccepted: ${otherAcceptedCount}`);
  
  // We ensure uniqueness by ID when displaying swaps
  const uniqueSwapsMap = new Map<string, SwapMatch>();
  
  // Add all swaps to the map, using the ID as key to ensure uniqueness
  swaps.forEach(swap => {
    // Log each swap's colleague types and status for debugging
    console.log(`Adding swap ${swap.id} to map with status ${swap.status} and colleague types:`, {
      myShift: swap.myShift?.colleagueType,
      otherShift: swap.otherShift?.colleagueType
    });
    uniqueSwapsMap.set(swap.id, swap);
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
          onAccept={!isPast && swap.status === 'pending' ? onAcceptSwap : undefined}
          onFinalize={!isPast && swap.status === 'accepted' ? onFinalizeSwap : undefined}
          onResendEmail={!isPast && swap.status === 'accepted' ? onResendEmail : undefined}
          allMatches={swaps} // Pass all swaps for reference if needed
        />
      ))}
    </div>
  );
};
