
import { Shift } from '@/hooks/useShiftData';

export interface PreferredDate {
  date: string;
  acceptedTypes: string[];
}

export interface SwapRequest {
  id: string;
  status: string;
  originalShift: Omit<Shift, 'colleagueType'>;
  preferredDates: PreferredDate[];
}

export interface UseSwapRequestsReturn {
  swapRequests: SwapRequest[];
  isLoading: boolean;
  fetchSwapRequests: () => Promise<void>;
  handleDeleteSwapRequest: (requestId: string) => Promise<void>;
  handleDeletePreferredDate: (requestId: string, dateStr: string) => Promise<void>;
}
