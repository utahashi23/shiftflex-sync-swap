
// Type definitions for the matched swaps functionality

export interface SwapMatch {
  id: string;
  status: "pending" | "accepted" | "completed" | "other_accepted";
  myShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName?: string;
    type: "day" | "afternoon" | "night" | "unknown";
    colleagueType: string;
    employeeId?: string;
  };
  otherShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName?: string;
    type: "day" | "afternoon" | "night" | "unknown";
    userId: string;
    userName: string;
    colleagueType: string;
    employeeId?: string;
  };
  myRequestId: string;
  otherRequestId: string;
  createdAt: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  matchId: string | null;
}
