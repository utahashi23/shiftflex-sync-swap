
export interface ShiftDetail {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  colleagueType?: string;
  colleague?: string;
}

export interface MatchedSwap {
  id: string;
  originalShift: ShiftDetail;
  matchedShift: ShiftDetail;
  status: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  swapId: string | null;
}
