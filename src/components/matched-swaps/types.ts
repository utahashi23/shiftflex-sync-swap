
export type ShiftTypes = "day" | "afternoon" | "night" | "unknown";

export interface ShiftInfo {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  truckName: string | null;
  type: ShiftTypes;
  colleagueType: string;
  employeeId?: string;
  userId?: string;
}

export interface OtherShiftInfo extends ShiftInfo {
  userName: string;
  userId: string;
}

export interface SwapMatch {
  id: string;
  status: 'pending' | 'accepted' | 'other_accepted' | 'completed';
  myShift: ShiftInfo;
  otherShift: OtherShiftInfo;
  myRequestId?: string;
  otherRequestId?: string;
  createdAt?: string;
  requesterId?: string;
  acceptorId?: string;
  // New fields to track who has accepted
  requesterHasAccepted?: boolean;
  acceptorHasAccepted?: boolean;
}

export interface MatchesState {
  matches: SwapMatch[];
  pastMatches: SwapMatch[];
  isLoading: boolean;
  error: Error | null;
}

export interface SwapAction {
  match: SwapMatch;
  action: 'accept' | 'decline' | 'finalize';
}

// Add the missing ConfirmDialogState type that's referenced in useSwapDialogs.ts
export interface ConfirmDialogState {
  isOpen: boolean;
  matchId: string | null;
}
