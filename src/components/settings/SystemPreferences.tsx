
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CalendarIcon, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Define the view type
type RosterViewType = 'calendar' | 'card';

const SystemPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rosterView, setRosterView] = useState<RosterViewType>('card');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('system_preferences')
          .select('roster_default_view')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user preferences:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your preferences.',
            variant: 'destructive'
          });
          return;
        }
        
        if (data) {
          setRosterView(data.roster_default_view as RosterViewType);
        }
      } catch (error) {
        console.error('Error in fetchUserPreferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserPreferences();
  }, [user, toast]);

  const handleSavePreferences = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // Check if preferences exist first
      const { data: existingPreference, error: checkError } = await supabase
        .from('system_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      let result;
      
      if (existingPreference) {
        // Update existing preferences
        result = await supabase
          .from('system_preferences')
          .update({
            roster_default_view: rosterView,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Insert new preferences
        result = await supabase
          .from('system_preferences')
          .insert({
            user_id: user.id,
            roster_default_view: rosterView
          });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      toast({
        title: 'Preferences Saved',
        description: 'Your system preferences have been updated.'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save your preferences. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Preferences</CardTitle>
        <CardDescription>
          Configure how the system works for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Default Roster View</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how you'd like to view your roster by default
            </p>
            
            <RadioGroup 
              value={rosterView} 
              onValueChange={(value) => setRosterView(value as RosterViewType)}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card-view" />
                <Label htmlFor="card-view" className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  List View
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="calendar" id="calendar-view" />
                <Label htmlFor="calendar-view" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Calendar View
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button 
            onClick={handleSavePreferences}
            disabled={isLoading || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemPreferences;
