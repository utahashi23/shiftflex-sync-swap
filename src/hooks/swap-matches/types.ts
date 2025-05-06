
export interface SwapShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  truckName: string | null;
  type: 'day' | 'afternoon' | 'night' | 'unknown';
  colleagueType: string | null;
  employeeId?: string | null; // Added employeeId property
}

export interface OtherSwapShift extends SwapShift {
  userId: string;
  userName: string;
  employeeId?: string | null;
}

export interface SwapMatch {
  id: string;
  status: string;
  myShift: SwapShift;
  otherShift: OtherSwapShift;
  myRequestId: string;
  otherRequestId: string;
  createdAt: string;
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
