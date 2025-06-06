
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';

interface FormCustomization {
  truck_name_label: string;
  truck_name_placeholder: string;
  show_colleague_type: boolean;
  region_preferences_button_text: string;
}

export const FormCustomizationSettings = () => {
  const [settings, setSettings] = useState<FormCustomization>({
    truck_name_label: 'Truck Name',
    truck_name_placeholder: 'Search for a truck name',
    show_colleague_type: true,
    region_preferences_button_text: 'Region/Area Preferences'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load existing settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_preferences')
        .select('*')
        .eq('category', 'form_customization')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        const dbSettings = data.settings as Record<string, any>;
        console.log('Loaded settings from DB:', dbSettings);
        
        setSettings(prev => ({
          ...prev,
          truck_name_label: dbSettings.truck_name_label || prev.truck_name_label,
          truck_name_placeholder: dbSettings.truck_name_placeholder || prev.truck_name_placeholder,
          show_colleague_type: typeof dbSettings.show_colleague_type === 'boolean' 
            ? dbSettings.show_colleague_type 
            : dbSettings.show_colleague_type === 'true' || dbSettings.show_colleague_type === true,
          region_preferences_button_text: dbSettings.region_preferences_button_text || prev.region_preferences_button_text
        }));
      }
    } catch (error) {
      console.error('Error loading form customization settings:', error);
      toast({
        title: "Error",
        description: "Failed to load form customization settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      console.log('Saving settings:', settings);
      
      // Ensure we have a user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create the settings object with explicit types
      const settingsToSave = {
        truck_name_label: settings.truck_name_label,
        truck_name_placeholder: settings.truck_name_placeholder,
        show_colleague_type: Boolean(settings.show_colleague_type),
        region_preferences_button_text: settings.region_preferences_button_text
      };

      console.log('Settings being saved:', settingsToSave);

      const { error } = await supabase
        .from('system_preferences')
        .upsert({
          category: 'form_customization',
          settings: settingsToSave,
          updated_at: new Date().toISOString(),
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form customization settings saved successfully",
      });
      
      // Reload settings to verify save
      await loadSettings();
    } catch (error) {
      console.error('Error saving form customization settings:', error);
      toast({
        title: "Error",
        description: "Failed to save form customization settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormCustomization, value: string | boolean) => {
    console.log(`Updating ${field} to:`, value, typeof value);
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Truck Name Field Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="truck-name-label">Field Label</Label>
            <Input
              id="truck-name-label"
              value={settings.truck_name_label}
              onChange={(e) => handleInputChange('truck_name_label', e.target.value)}
              placeholder="e.g., Vehicle Name, Unit ID, etc."
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="truck-name-placeholder">Field Placeholder Text</Label>
            <Input
              id="truck-name-placeholder"
              value={settings.truck_name_placeholder}
              onChange={(e) => handleInputChange('truck_name_placeholder', e.target.value)}
              placeholder="e.g., Search for a vehicle, Enter unit ID, etc."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Button Text Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="region-preferences-button">Region/Area Preferences Button Text</Label>
            <Input
              id="region-preferences-button"
              value={settings.region_preferences_button_text}
              onChange={(e) => handleInputChange('region_preferences_button_text', e.target.value)}
              placeholder="e.g., Location Preferences, Area Settings, etc."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field Visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-colleague-type">Show Colleague Type Field</Label>
              <p className="text-sm text-muted-foreground">
                Controls whether the colleague type field is visible in the Add Shift form
              </p>
              <p className="text-xs text-gray-500">
                Current value: {String(settings.show_colleague_type)} ({typeof settings.show_colleague_type})
              </p>
            </div>
            <Switch
              id="show-colleague-type"
              checked={settings.show_colleague_type}
              onCheckedChange={(checked) => handleInputChange('show_colleague_type', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};
