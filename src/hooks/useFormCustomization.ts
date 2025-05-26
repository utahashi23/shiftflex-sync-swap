
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FormCustomization {
  truck_name_label: string;
  truck_name_placeholder: string;
  show_colleague_type: boolean;
}

const DEFAULT_SETTINGS: FormCustomization = {
  truck_name_label: 'Truck Name',
  truck_name_placeholder: 'Search for a truck name',
  show_colleague_type: true
};

export const useFormCustomization = () => {
  const [settings, setSettings] = useState<FormCustomization>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_preferences')
        .select('settings')
        .eq('category', 'form_customization')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        const dbSettings = data.settings as Record<string, any>;
        setSettings({ 
          ...DEFAULT_SETTINGS, 
          ...dbSettings 
        });
      }
    } catch (error) {
      console.error('Error fetching form customization settings:', error);
      // Use default settings on error
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    isLoading,
    refetch: fetchSettings
  };
};
