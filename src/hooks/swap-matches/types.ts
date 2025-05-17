
// Basic shift information type
export interface ShiftInfo {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  truckName?: string;
  type: string; 
  colleagueType: string;
  employeeId?: string;
  userId?: string;
}

// Information about the other person's shift
export interface OtherShiftInfo extends ShiftInfo {
  userName: string;
  userId: string;
}

// A potential match between two shifts
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
  // Fields to track who has accepted
  requesterHasAccepted?: boolean;
  acceptorHasAccepted?: boolean;
}

// State for the swap matches hook
export interface SwapMatchesState {
  matches: SwapMatch[];
  pastMatches: SwapMatch[];
  rawApiData: any;
  isLoading: boolean;
  error: Error | null;
}

// Return type for the swap matches hook
export interface UseSwapMatchesReturn extends SwapMatchesState {
  fetchMatches: (userPerspectiveOnly?: boolean, userInitiatorOnly?: boolean) => Promise<void>;
  acceptMatch: (matchId: string) => Promise<boolean>;
  cancelMatch: (matchId: string) => Promise<boolean>;
  finalizeMatch: (matchId: string) => Promise<boolean>;
  completeMatch: (matchId: string) => Promise<boolean>;
}
