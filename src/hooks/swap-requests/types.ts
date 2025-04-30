
import { ShiftDetails, PreferredDate } from '@/components/swaps/SwapRequestCard';

export interface SwapRequest {
  id: string;
  originalShift: ShiftDetails;
  preferredDates: PreferredDate[];
  status: string;
}

export interface UseSwapRequestsReturn {
  swapRequests: SwapRequest[];
  isLoading: boolean;
  fetchSwapRequests: () => Promise<void>;
  handleDeleteSwapRequest: (requestId: string) => Promise<void>;
  handleDeletePreferredDate: (requestId: string, dateStr: string) => Promise<void>;
}
