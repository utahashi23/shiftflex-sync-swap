
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
    type: "day" | "afternoon" | "night" | "unknown";
    colleagueType?: string | null;
  };
  otherShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: "day" | "afternoon" | "night" | "unknown";
    userId: string;
    userName: string;
    colleagueType?: string | null;
  };
  myRequestId: string;
  otherRequestId: string;
  createdAt: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  matchId: string | null;
}
