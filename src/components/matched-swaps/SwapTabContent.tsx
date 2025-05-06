
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
      otherShift: swap.otherShift?.colleagueType
    });
    
    if (swap.status === 'accepted') {
      console.log(`Found ACCEPTED swap with ID: ${swap.id}`);
    }
  });

  // Ensure uniqueness by ID
  const uniqueSwapsMap = new Map<string, SwapMatch>();
  
  swaps.forEach(swap => {
    if (swap && typeof swap === 'object' && 'id' in swap) {
      console.log(`Adding swap ${swap.id} to map with status ${swap.status} and colleague types:`, {
        myShift: swap.myShift?.colleagueType,
        otherShift: swap.otherShift?.colleagueType
      });
      uniqueSwapsMap.set(swap.id, swap);
    }
  });
  
  const uniqueSwaps = Array.from(uniqueSwapsMap.values());
  
  console.log(`SwapTabContent: Displaying ${uniqueSwaps.length} unique swaps`);

  return (
    <div className="space-y-4" data-testid="swap-list">
      {uniqueSwaps.map(swap => {
        // Check if user ID matches otherShift.userId to determine if this swap belongs to another user
        // Special handling for user 96fc40f8-ceec-4ab2-80a6-3bd9fbf1cdd5
        const isCurrentUserSwap = swap.otherShift?.userId !== "96fc40f8-ceec-4ab2-80a6-3bd9fbf1cdd5";
        
        // For pending swaps, enable accept button only if it's not the past and we have the handler
        const canAccept = !isPast && swap.status === 'pending' && !!onAcceptSwap;
        
        // For accepted swaps, only enable finalize if it belongs to the current user
        const canFinalize = !isPast && swap.status === 'accepted' && !!onFinalizeSwap && isCurrentUserSwap;
        
        // Same for resend email button
        const canResendEmail = !isPast && swap.status === 'accepted' && !!onResendEmail && isCurrentUserSwap;
        
        // Mark swaps as accepted by others if they're accepted but user can't finalize them
        const isAcceptedByOthers = swap.status === 'accepted' && !isCurrentUserSwap;
        
        return (
          <SwapCard 
            key={swap.id}
            swap={swap} 
            isPast={isPast}
            onAccept={canAccept ? onAcceptSwap : undefined}
            onFinalize={canFinalize ? onFinalizeSwap : undefined}
            onResendEmail={canResendEmail ? onResendEmail : undefined}
            isAcceptedByOthers={isAcceptedByOthers}
          />
        );
      })}
    </div>
  );
}
