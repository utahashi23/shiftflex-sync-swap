
import { SwapMatch } from "@/hooks/useSwapMatches";

// Re-export types from the useSwapMatches hook
export type { SwapMatch };

export interface ConfirmDialogState {
  isOpen: boolean;
  matchId: string | null;
}
