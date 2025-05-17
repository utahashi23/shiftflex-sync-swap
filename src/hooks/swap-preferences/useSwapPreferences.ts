
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

      if (data && data.length > 0) {
        // Found preferences
        setPreferences({
          id: data[0].id,
          userId: data[0].user_id,
          preferredAreas: data[0].preferred_areas || [],
          acceptableShiftTypes: data[0].acceptable_shift_types || ['day', 'afternoon', 'night'],
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at || data[0].created_at,
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

      // Check if preferences already exist
      if (preferences?.id) {
        // Update existing preferences
        const { error } = await supabase
          .from('shift_swap_preferences')
          .update({
            preferred_areas: prefs.preferredAreas || preferences.preferredAreas,
            acceptable_shift_types: prefs.acceptableShiftTypes || preferences.acceptableShiftTypes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', preferences.id);

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
