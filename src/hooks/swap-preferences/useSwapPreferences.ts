
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SwapPreference, UseSwapPreferencesReturn } from './types';
import { toast } from '@/hooks/use-toast';

export function useSwapPreferences(): UseSwapPreferencesReturn {
  const [preferences, setPreferences] = useState<SwapPreference | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchPreferences = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('shift_swap_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        throw error;
      }
      
      if (data) {
        setPreferences({
          id: data.id,
          userId: data.user_id,
          preferredAreas: data.preferred_areas || [],
          acceptableShiftTypes: data.acceptable_shift_types || ['day', 'afternoon', 'night'],
          createdAt: data.created_at,
          updatedAt: data.updated_at
        });
      }
    } catch (err: any) {
      console.error('Error fetching swap preferences:', err);
      setError(err);
      toast({
        title: "Failed to load preferences",
        description: "There was a problem loading your swap preferences.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<SwapPreference>): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      
      const preferencesData = {
        user_id: user.id,
        preferred_areas: newPreferences.preferredAreas || [],
        acceptable_shift_types: newPreferences.acceptableShiftTypes || ['day', 'afternoon', 'night']
      };
      
      // Check if preferences already exist for this user
      const { data: existingData } = await supabase
        .from('shift_swap_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      let result;
      
      if (existingData?.id) {
        // Update existing preferences
        result = await supabase
          .from('shift_swap_preferences')
          .update(preferencesData)
          .eq('id', existingData.id)
          .select();
      } else {
        // Insert new preferences
        result = await supabase
          .from('shift_swap_preferences')
          .insert(preferencesData)
          .select();
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Update the local state with new data
      if (result.data && result.data[0]) {
        const updated = result.data[0];
        setPreferences({
          id: updated.id,
          userId: updated.user_id,
          preferredAreas: updated.preferred_areas || [],
          acceptableShiftTypes: updated.acceptable_shift_types || ['day', 'afternoon', 'night'],
          createdAt: updated.created_at,
          updatedAt: updated.updated_at
        });
      }
      
      toast({
        title: "Success",
        description: "Swap preferences successfully updated.",
      });
      
      return true;
    } catch (err: any) {
      console.error('Error saving swap preferences:', err);
      setError(err);
      toast({
        title: "Failed to save preferences",
        description: "There was a problem saving your swap preferences.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Load preferences when user changes
  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  return {
    preferences,
    isLoading,
    error,
    savePreferences,
    fetchPreferences
  };
}
