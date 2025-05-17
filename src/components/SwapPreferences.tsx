
import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSwapPreferences } from '@/hooks/swap-preferences';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";

// Mock data for areas - in a real app, fetch this from the database
const AREAS = [
  { id: '1', name: 'North Region' },
  { id: '2', name: 'South Region' },
  { id: '3', name: 'East Region' },
  { id: '4', name: 'West Region' },
  { id: '5', name: 'Central Region' },
];

// Shift types
const SHIFT_TYPES = [
  { id: 'day', label: 'Day Shift' },
  { id: 'afternoon', label: 'Afternoon Shift' },
  { id: 'night', label: 'Night Shift' },
];

const SwapPreferences = () => {
  const { preferences, isLoading, savePreferences } = useSwapPreferences();
  const { toast } = useToast();
  
  // Local state for selected preferences
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [acceptableTypes, setAcceptableTypes] = useState<string[]>(['day', 'afternoon', 'night']);
  
  // Initialize local state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setSelectedAreas(preferences.preferredAreas || []);
      setAcceptableTypes(preferences.acceptableShiftTypes || ['day', 'afternoon', 'night']);
    }
  }, [preferences]);
  
  const handleAreaToggle = (areaId: string) => {
    setSelectedAreas(prev => 
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };
  
  const handleTypeToggle = (typeId: string) => {
    // Don't allow deselecting all types
    const newTypes = acceptableTypes.includes(typeId)
      ? acceptableTypes.filter(id => id !== typeId)
      : [...acceptableTypes, typeId];
      
    if (newTypes.length === 0) {
      toast({
        title: "At least one shift type required",
        description: "You must accept at least one shift type.",
        variant: "destructive"
      });
      return;
    }
    
    setAcceptableTypes(newTypes);
  };
  
  const handleSavePreferences = async () => {
    const success = await savePreferences({
      preferredAreas: selectedAreas,
      acceptableShiftTypes: acceptableTypes as ('day' | 'afternoon' | 'night')[]
    });
    
    if (success) {
      toast({
        title: "Preferences Saved",
        description: "Your swap preferences have been updated successfully.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swap Preferences</CardTitle>
        <CardDescription>
          Set your preferences for shift swaps
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preferred Areas</h3>
              <p className="text-sm text-muted-foreground">
                Select the areas you're willing to work in
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {AREAS.map(area => (
                  <div key={area.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`area-${area.id}`} 
                      checked={selectedAreas.includes(area.id)}
                      onCheckedChange={() => handleAreaToggle(area.id)}
                    />
                    <Label htmlFor={`area-${area.id}`}>{area.name}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Acceptable Shift Types</h3>
              <p className="text-sm text-muted-foreground">
                Select the shift types you're willing to accept
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SHIFT_TYPES.map(type => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`type-${type.id}`} 
                      checked={acceptableTypes.includes(type.id)}
                      onCheckedChange={() => handleTypeToggle(type.id)}
                    />
                    <Label htmlFor={`type-${type.id}`}>{type.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={handleSavePreferences}
              className="w-full"
            >
              Save Preferences
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SwapPreferences;
