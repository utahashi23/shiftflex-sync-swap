
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ShiftType, SwapPreference, UseSwapPreferencesReturn } from './types';

export const useSwapPreferences = (): UseSwapPreferencesReturn => {
  const [preferences, setPreferences] = useState<SwapPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchPreferences = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First try to get the user's preferences using RPC
      const { data, error } = await supabase.rpc('get_user_swap_preferences', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching preferences via RPC:', error);
        throw error;
      }

      // Check for existing preferences - first try from swap_preferences table
      const { data: prefsData, error: prefsError } = await supabase
        .from('shift_swap_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching from shift_swap_preferences:', prefsError);
      }

      if (prefsData) {
        // Found preferences in shift_swap_preferences
        // Make sure to validate shift types against the ShiftType enum
        const validatedShiftTypes = prefsData.acceptable_shift_types?.map((type: string) => {
          // Validate if the type is one of the allowed ShiftTypes
          if (type === 'day' || type === 'afternoon' || type === 'night') {
            return type as ShiftType;
          }
          return 'day' as ShiftType; // Default fallback
        }) || ['day', 'afternoon', 'night'] as ShiftType[];

        setPreferences({
          id: prefsData.id,
          userId: prefsData.user_id,
          preferredAreas: prefsData.preferred_areas || [],
          acceptableShiftTypes: validatedShiftTypes,
          createdAt: prefsData.created_at,
          updatedAt: prefsData.updated_at || prefsData.created_at,
        });
      } else if (data && data.length > 0) {
        // Convert the user_swap_preferences data into our expected format
        // Note: user_swap_preferences has region_id and area_id columns
        // We need to aggregate them into arrays

        // Extract all area_ids (non-null)
        const preferredAreas = data
          .filter(pref => pref.area_id !== null)
          .map(pref => pref.area_id);

        // For now, default to all shift types since that table doesn't store shift types
        const acceptableShiftTypes: ShiftType[] = ['day', 'afternoon', 'night'];

        setPreferences({
          id: data[0].id, // Use first id as reference
          userId: data[0].user_id,
          preferredAreas, 
          acceptableShiftTypes,
          createdAt: data[0].created_at,
          updatedAt: data[0].created_at // Use created_at as updated_at since it's not available
        });
      } else {
        // No preferences found
        setPreferences(null);
      }
    } catch (err) {
      console.error('Error in fetchPreferences:', err);
      setError(err as Error);
      toast({
        title: 'Error',
        description: 'Failed to load swap preferences',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (prefs: Partial<SwapPreference>): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsLoading(true);
      setError(null);

      // Check if preferences already exist in shift_swap_preferences
      const { data: existingPrefs } = await supabase
        .from('shift_swap_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingPrefs) {
        // Update existing preferences
        const { error } = await supabase
          .from('shift_swap_preferences')
          .update({
            preferred_areas: prefs.preferredAreas || [],
            acceptable_shift_types: prefs.acceptableShiftTypes || ['day', 'afternoon', 'night'],
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPrefs.id);

        if (error) throw error;
      } else {
        // Create new preferences
        const { error } = await supabase.from('shift_swap_preferences').insert({
          user_id: user.id,
          preferred_areas: prefs.preferredAreas || [],
          acceptable_shift_types: prefs.acceptableShiftTypes || ['day', 'afternoon', 'night'],
        });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Swap preferences saved successfully',
      });

      // Fetch updated preferences
      await fetchPreferences();
      return true;
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err as Error);
      toast({
        title: 'Error',
        description: 'Failed to save swap preferences',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  return { preferences, isLoading, error, savePreferences, fetchPreferences };
};
