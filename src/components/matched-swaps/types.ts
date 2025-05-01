
// Type definitions for the matched swaps functionality

export interface SwapMatch {
  id: string;
  status: string;
  myShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: string;
  };
  otherShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: string;
    userId: string;
    userName: string;
  };
  myRequestId: string;
  otherRequestId: string;
  createdAt: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  matchId: string | null;
}

// Re-export types from the SwapMatch
export type { SwapMatch };

// Define a type for matched swaps used in older files (for compatibility)
export interface MatchedSwap {
  id: string;
  originalShift: {
    id: string;
    date: string;
    type: string;
    title: string;
    startTime: string;
    endTime: string;
    colleagueType: string;
  };
  matchedShift: {
    id: string;
    date: string;
    type: string;
    title: string;
    startTime: string;
    endTime: string;
    colleagueType: string;
    colleague: string;
  };
  status: string;
}
