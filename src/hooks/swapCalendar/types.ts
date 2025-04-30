
import { Shift } from '@/hooks/useShiftData';

export interface AcceptableShiftTypes {
  day: boolean;
  afternoon: boolean;
  night: boolean;
}

export interface SwapCalendarState {
  currentDate: Date;
  shifts: Shift[];
  selectedShift: Shift | null;
  swapMode: boolean;
  selectedSwapDates: string[];
  acceptableShiftTypes: AcceptableShiftTypes;
  isLoading: boolean;
}

export interface SwapCalendarActions {
  setShifts: (shifts: Shift[]) => void;
  setSelectedShift: (shift: Shift | null) => void;
  toggleDateSelection: (dateStr: string) => void;
  handleShiftClick: (shift: Shift) => void;
  handleRequestSwap: () => void;
  handleSaveSwapRequest: () => void;
  handleCancelSwapRequest: () => void;
  changeMonth: (increment: number) => void;
  setAcceptableShiftTypes: React.Dispatch<React.SetStateAction<AcceptableShiftTypes>>;
}

export interface SwapCalendarHelpers {
  getShiftForDate: (dateStr: string) => Shift | undefined;
  hasShift: (dateStr: string) => boolean;
  isDateSelectedForSwap: (dateStr: string) => boolean;
  isDateDisabled: (dateStr: string) => boolean;
}

export interface SwapCalendarRender {
  renderCalendar: () => JSX.Element[];
}
