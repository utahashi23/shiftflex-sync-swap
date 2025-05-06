
export interface SwapShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  truckName: string | null;
  type: 'day' | 'afternoon' | 'night' | 'unknown';
  colleagueType: string | null;
}

export interface OtherSwapShift extends SwapShift {
  userId: string;
  userName: string;
}

export interface SwapMatch {
  id: string;
  status: string;
  myShift: SwapShift;
  otherShift: OtherSwapShift;
  myRequestId: string;
  otherRequestId: string;
  createdAt: string;
  isConflictingWithAccepted?: boolean; // New field to indicate if this swap conflicts with an accepted swap
}

export interface SwapMatchesState {
  matches: SwapMatch[];
  pastMatches: SwapMatch[];
  rawApiData: any | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseSwapMatchesReturn extends SwapMatchesState {
  fetchMatches: (userPerspectiveOnly?: boolean, userInitiatorOnly?: boolean) => Promise<void>;
  acceptMatch: (matchId: string) => Promise<boolean>;
  finalizeMatch: (matchId: string) => Promise<boolean>;
  completeMatch: (matchId: string) => Promise<boolean>;
}
