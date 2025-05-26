
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
        console.log('useFormCustomization - Raw DB settings:', dbSettings);
        
        const processedSettings: FormCustomization = {
          truck_name_label: dbSettings.truck_name_label || DEFAULT_SETTINGS.truck_name_label,
          truck_name_placeholder: dbSettings.truck_name_placeholder || DEFAULT_SETTINGS.truck_name_placeholder,
          show_colleague_type: typeof dbSettings.show_colleague_type === 'boolean' 
            ? dbSettings.show_colleague_type 
            : dbSettings.show_colleague_type === 'true' || dbSettings.show_colleague_type === true
        };
        
        console.log('useFormCustomization - Processed settings:', processedSettings);
        setSettings(processedSettings);
      } else {
        console.log('useFormCustomization - No settings found, using defaults');
        setSettings(DEFAULT_SETTINGS);
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
