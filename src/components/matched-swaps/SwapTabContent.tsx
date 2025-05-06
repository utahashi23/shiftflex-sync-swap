
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
      {uniqueSwaps.map(swap => {
        // The fixed user ID that represents our special user
        const specialUserId = "96fc40f8-ceec-4ab2-80a6-3bd9fbf1cdd5";
        
        // Check if this swap belongs to the special user
        // If the special user is the other user in this swap, then the current user is NOT the special user
        const isSpecialUserInvolved = swap.otherShift?.userId === specialUserId;
        
        // For pending swaps, show accept button only if it's not in the past and we have the handler
        const showAcceptButton = !isPast && swap.status === 'pending' && !!onAcceptSwap;
        
        // For accepted swaps, determine if the current user can finalize based on who is involved
        // Only the non-special user should be able to finalize the swap
        const showFinalizeButton = !isPast && 
                                  swap.status === 'accepted' && 
                                  !!onFinalizeSwap && 
                                  !isSpecialUserInvolved;
        
        // Same logic for resend email button
        const showResendEmailButton = !isPast && 
                                     swap.status === 'accepted' && 
                                     !!onResendEmail && 
                                     !isSpecialUserInvolved;
        
        // Mark swap as "accepted by others" if the special user is involved in an accepted swap
        // This means the current normal user cannot take actions on it
        const isAcceptedByOthers = swap.status === 'accepted' && isSpecialUserInvolved;
        
        return (
          <SwapCard 
            key={swap.id}
            swap={swap} 
            isPast={isPast}
            onAccept={showAcceptButton ? onAcceptSwap : undefined}
            onFinalize={showFinalizeButton ? onFinalizeSwap : undefined}
            onResendEmail={showResendEmailButton ? onResendEmail : undefined}
            isAcceptedByOthers={isAcceptedByOthers}
          />
        );
      })}
    </div>
  );
}
