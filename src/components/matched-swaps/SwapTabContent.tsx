
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

  // The fixed user ID that represents our special user
  const specialUserId = "96fc40f8-ceec-4ab2-80a6-3bd9fbf1cdd5";
  
  return (
    <div className="space-y-4" data-testid="swap-list">
      {uniqueSwaps.map(swap => {
        // Determine if the current logged-in user is the special user
        const isCurrentUserSpecial = swap.myShift?.userId === specialUserId;
        
        console.log(`Checking swap ${swap.id}: isCurrentUserSpecial = ${isCurrentUserSpecial}, myShiftUserId = ${swap.myShift?.userId}`);
        
        // Check if this swap involves the special user at all (either as my user or other user)
        const isSpecialUserInvolved = isCurrentUserSpecial || swap.otherShift?.userId === specialUserId;
        
        // Always hide buttons for the special user - the special user should NEVER see action buttons
        // Also hide buttons when a non-special user is interacting with the special user in an accepted swap
        const hideActionButtons = isCurrentUserSpecial || 
                                (swap.otherShift?.userId === specialUserId && swap.status === 'accepted');
        
        console.log(`Swap ${swap.id} button visibility: hideActionButtons = ${hideActionButtons}, isSpecialUserInvolved = ${isSpecialUserInvolved}`);
        
        // For pending swaps, show accept button only if it's not in the past, we have the handler, and it's not hidden
        const showAcceptButton = !isPast && 
                              swap.status === 'pending' && 
                              !!onAcceptSwap && 
                              !hideActionButtons;
        
        // For accepted swaps, only show finalize/resend buttons if they shouldn't be hidden
        const showFinalizeButton = !isPast && 
                                 swap.status === 'accepted' && 
                                 !!onFinalizeSwap && 
                                 !hideActionButtons;
        
        const showResendEmailButton = !isPast && 
                                    swap.status === 'accepted' && 
                                    !!onResendEmail && 
                                    !hideActionButtons;
        
        // Mark swap as "accepted by others" if it's an accepted swap involving the special user
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
