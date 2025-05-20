
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";

// Define the view types
type RosterViewType = 'calendar' | 'card';

// Define the system preferences type
interface SystemPreferences {
  id?: string;
  user_id: string;
  roster_default_view: RosterViewType;
  created_at?: string;
  updated_at?: string;
}

export function SystemPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultRosterView, setDefaultRosterView] = useState<RosterViewType>('card');
  
  // Fetch the user's system preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          throw error;
        }
        
        if (data) {
          setDefaultRosterView(data.roster_default_view || 'card');
        }
      } catch (error) {
        console.error('Error fetching system preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPreferences();
  }, [user]);
  
  // Save the user's system preferences
  const savePreferences = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const preferences: SystemPreferences = {
        user_id: user.id,
        roster_default_view: defaultRosterView,
      };
      
      // Check if the user already has preferences
      const { data: existingData } = await supabase
        .from('system_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      let result;
      
      if (existingData?.id) {
        // Update existing preferences
        result = await supabase
          .from('system_preferences')
          .update(preferences)
          .eq('id', existingData.id)
          .select();
      } else {
        // Insert new preferences
        result = await supabase
          .from('system_preferences')
          .insert(preferences)
          .select();
      }
      
      if (result.error) throw result.error;
      
      toast({
        title: "Preferences Saved",
        description: "Your system preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving system preferences:', error);
      toast({
        title: "Error Saving Preferences",
        description: "There was a problem saving your preferences.",
        variant: "destructive",
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
          Configure your system interface preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Roster View</Label>
                <p className="text-sm text-muted-foreground">
                  Choose your default roster view
                </p>
              </div>
              
              <RadioGroup 
                value={defaultRosterView} 
                onValueChange={(value) => setDefaultRosterView(value as RosterViewType)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                <div className="flex items-center space-x-2 rounded-md border p-3">
                  <RadioGroupItem value="calendar" id="calendar-view" />
                  <Label htmlFor="calendar-view" className="flex-grow cursor-pointer">
                    Calendar View
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border p-3">
                  <RadioGroupItem value="card" id="list-view" />
                  <Label htmlFor="list-view" className="flex-grow cursor-pointer">
                    List View
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Button 
              onClick={savePreferences}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
