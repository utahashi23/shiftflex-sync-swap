
import { SwapMatch } from "./types";
import { SwapCard } from "./SwapCard";
import { EmptySwapState } from "./EmptySwapState";

interface SwapTabContentProps {
  swaps: SwapMatch[];
  isPast?: boolean;
  onAcceptSwap?: (matchId: string) => void;
  onFinalizeSwap?: (matchId: string) => void;
  onCancelSwap?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
}

export const SwapTabContent = ({ 
  swaps, 
  isPast = false, 
  onAcceptSwap, 
  onFinalizeSwap,
  onCancelSwap,
  onResendEmail
}: SwapTabContentProps) => {
  // Detailed logging of swaps data including colleague types and statuses
  console.log(`SwapTabContent: Rendering ${swaps?.length || 0} ${isPast ? 'past' : 'active'} swaps`);
  
  if (swaps && swaps.length > 0) {
    // Log the colleague types and status of all swaps for debugging
    swaps.forEach((swap, index) => {
      console.log(`Swap ${index} (ID: ${swap.id}, Status: ${swap.status}) colleague types:`, {
        myShift: swap.myShift?.colleagueType,
        otherShift: swap.otherShift?.colleagueType
      });
      
      // Debug output for specific statuses
      if (swap.status === 'accepted') {
        console.log(`Found ACCEPTED swap with ID: ${swap.id}`);
      }
      
      if (swap.status === 'other_accepted') {
        console.log(`Found OTHER_ACCEPTED swap with ID: ${swap.id}`);
      }
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
  
  // Only add items to the map if they're actually SwapMatch objects with colleague type
  swaps.forEach(swap => {
    if (swap && typeof swap === 'object' && 'id' in swap) {
      // Log each swap's colleague types for debugging
      console.log(`Adding swap ${swap.id} to map with status ${swap.status} and colleague types:`, {
        myShift: swap.myShift?.colleagueType,
        otherShift: swap.otherShift?.colleagueType
      });
      uniqueSwapsMap.set(swap.id, swap);
    }
  });
  
  const uniqueSwaps = Array.from(uniqueSwapsMap.values());
  
  console.log(`SwapTabContent: Displaying ${uniqueSwaps.length} unique swaps`);
  console.log(`SwapTabContent: Status breakdown:`, {
    pending: uniqueSwaps.filter(s => s.status === 'pending').length,
    accepted: uniqueSwaps.filter(s => s.status === 'accepted').length,
    other_accepted: uniqueSwaps.filter(s => s.status === 'other_accepted').length,
    completed: uniqueSwaps.filter(s => s.status === 'completed').length
  });

  return (
    <div className="space-y-4" data-testid="swap-list">
      {uniqueSwaps.map(swap => (
        <SwapCard 
          key={swap.id}
          swap={swap} 
          isPast={isPast}
          onAccept={!isPast && swap.status === 'pending' ? onAcceptSwap : undefined}
          onFinalize={!isPast && swap.status === 'accepted' ? onFinalizeSwap : undefined}
          onCancel={!isPast && swap.status === 'accepted' ? onCancelSwap : undefined}
          onResendEmail={!isPast && swap.status === 'accepted' ? onResendEmail : undefined}
        />
      ))}
    </div>
  );
};
