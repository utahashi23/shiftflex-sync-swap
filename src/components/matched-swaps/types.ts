
// Type definitions for the matched swaps functionality

export interface SwapMatch {
  id: string;
  status: "pending" | "accepted" | "other_accepted" | "dual_accepted" | "completed";
  myShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: "day" | "afternoon" | "night" | "unknown";
    colleagueType: string | null;
    employeeId?: string | null;
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
    colleagueType: string | null;
    employeeId?: string | null;
  };
  myRequestId: string;
  otherRequestId: string;
  requesterId?: string; // Requester ID to determine who initiated the swap
  createdAt: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  matchId: string | null;
}

export interface SwapCardProps {
  swap: SwapMatch;
  isPast?: boolean;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
  onCancel?: (matchId: string) => void;
  onResendEmail?: (matchId: string) => void;
}
