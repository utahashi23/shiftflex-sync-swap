
export interface SwapPreference {
  id: string;
  userId: string;
  preferredAreas: string[];
  acceptableShiftTypes: ShiftType[];
  createdAt: string;
  updatedAt: string;
}

export type ShiftType = 'day' | 'afternoon' | 'night';

export interface UseSwapPreferencesReturn {
  preferences: SwapPreference | null;
  isLoading: boolean;
  error: Error | null;
  savePreferences: (preferences: Partial<SwapPreference>) => Promise<boolean>;
  fetchPreferences: () => Promise<void>;
}
