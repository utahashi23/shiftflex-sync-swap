
import { EmptySwapState } from './EmptySwapState';
import { MatchedSwap } from './types';
import { SwapCard } from './SwapCard';
import { Skeleton } from "../ui/skeleton";

interface SwapTabContentProps {
  swaps: MatchedSwap[];
  isPast?: boolean;
  isLoading?: boolean;
  onAcceptSwap?: (swapId: string) => void;
}

export function SwapTabContent({ 
  swaps,
  isPast = false,
  isLoading = false,
  onAcceptSwap 
}: SwapTabContentProps) {
  // Loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Skeleton 
            key={i} 
            className="w-full h-[300px] rounded-md bg-secondary/40" 
          />
        ))}
      </div>
    );
  }
  
  // Empty state
  if (!swaps || swaps.length === 0) {
    return (
      <EmptySwapState 
        title={isPast ? "No past swaps" : "No matches found"} 
        description={
          isPast 
            ? "You haven't completed any shift swaps yet." 
            : "No matched swaps were found. Try finding matches or waiting for your request to be matched."
        }
      />
    );
  }
  
  // List of swap cards
  return (
    <div className="space-y-4">
      {swaps.map(swap => (
        <SwapCard 
          key={swap.id}
          swap={swap}
          isPast={isPast}
          onAccept={isPast ? undefined : onAcceptSwap}
        />
      ))}
    </div>
  );
}
