
import { SwapRequest } from '@/types/swapTypes';

// Mock data for demonstration
export const mockSwaps: SwapRequest[] = [
  {
    id: '1',
    status: 'pending',
    requestDate: '2025-04-29',
    requesterShift: {
      id: '101',
      date: '2025-05-15',
      title: '02-MAT01',
      startTime: '07:00',
      endTime: '15:00',
      type: 'day',
    },
    acceptableShifts: {
      types: ['day', 'afternoon'],
      dates: ['2025-05-18', '2025-05-20', '2025-05-22'],
    },
  },
  {
    id: '2',
    status: 'pending',
    requestDate: '2025-04-28',
    requesterShift: {
      id: '102',
      date: '2025-05-20',
      title: '06-MAT07',
      startTime: '23:00',
      endTime: '07:00',
      type: 'night',
    },
    acceptableShifts: {
      types: ['night'],
      dates: ['2025-05-21', '2025-05-22', '2025-05-23', '2025-05-24'],
    },
  },
];

// Fetch swap requests from API (mock)
export const fetchSwapRequests = async (userId: string | undefined): Promise<SwapRequest[]> => {
  // In a real app, we'd fetch from Supabase
  // const { data, error } = await supabase
  //   .from('shift_swap_requests')
  //   .select('*')
  //   .eq('requester_id', userId);
  
  // Simulate API request
  await new Promise(resolve => setTimeout(resolve, 1000));
  return mockSwaps;
};

// Cancel a swap request (mock)
export const cancelSwapRequest = async (swapId: string): Promise<string> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 800));
  return swapId;
};
