
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
  requesterId?: string; // Added field for the requester ID
  createdAt: string;
  hasAccepted?: boolean; // To track if current user has accepted
  otherHasAccepted?: boolean; // To track if other user has accepted
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
