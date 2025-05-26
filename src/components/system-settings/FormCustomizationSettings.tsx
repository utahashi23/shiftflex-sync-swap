
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
}

export const FormCustomizationSettings = () => {
  const [settings, setSettings] = useState<FormCustomization>({
    truck_name_label: 'Truck Name',
    truck_name_placeholder: 'Search for a truck name',
    show_colleague_type: true
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
        setSettings(prev => ({
          ...prev,
          ...dbSettings
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
      const { error } = await supabase
        .from('system_preferences')
        .upsert({
          category: 'form_customization',
          settings: settings as any,
          updated_at: new Date().toISOString(),
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form customization settings saved successfully",
      });
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
          <CardTitle>Field Visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-colleague-type">Show Colleague Type Field</Label>
              <p className="text-sm text-muted-foreground">
                Controls whether the colleague type field is visible in the Add Shift form
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
