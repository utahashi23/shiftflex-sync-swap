
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
