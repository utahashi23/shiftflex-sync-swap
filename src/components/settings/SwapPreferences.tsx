
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CheckedState } from '@radix-ui/react-checkbox';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface RegionWithAreas {
  id: string;
  name: string;
  areas: {
    id: string;
    name: string;
    selected: boolean;
  }[];
}

interface UserSwapPreference {
  id?: string;
  user_id: string;
  region_id: string | null;
  area_id: string | null;
}

export const SwapPreferences = () => {
  const [regions, setRegions] = useState<RegionWithAreas[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch regions, areas, and user preferences
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setError(null);
      try {
        console.log('Fetching swap preferences for user:', user.id);
        
        // Fetch all regions
        const { data: regionsData, error: regionsError } = await supabase
          .from('regions')
          .select('*')
          .eq('status', 'active')
          .order('name');
          
        if (regionsError) throw regionsError;
        
        console.log('Regions fetched:', regionsData);
        
        if (!regionsData || regionsData.length === 0) {
          console.log('No regions found in the database');
        }
        
        // Fetch all areas
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*, regions(name)')
          .eq('status', 'active')
          .order('name');
          
        if (areasError) throw areasError;
        
        console.log('Areas fetched:', areasData);
        
        if (!areasData || areasData.length === 0) {
          console.log('No areas found in the database');
        }
        
        // Try to fetch user preferences using direct query
        console.log('Fetching user preferences using direct query...');
        
        const { data: preferencesData, error: preferencesError } = await supabase
          .from('user_swap_preferences')
          .select('*')
          .eq('user_id', user.id);
          
        if (preferencesError) {
          console.error('Error fetching preferences via direct query:', preferencesError);
          throw preferencesError;
        }
        
        console.log('Successfully fetched preferences via direct query:', preferencesData);
        
        // Extract user's selected regions and areas
        const userRegions: string[] = [];
        const userAreas: string[] = [];
        
        if (preferencesData && Array.isArray(preferencesData)) {
          preferencesData.forEach((pref) => {
            if (pref.region_id) userRegions.push(pref.region_id);
            if (pref.area_id) userAreas.push(pref.area_id);
          });
        }
        
        console.log('User regions:', userRegions);
        console.log('User areas:', userAreas);
        
        setSelectedRegions(userRegions);
        setSelectedAreas(userAreas);
        
        // Transform data for the component
        const regionsWithAreas: RegionWithAreas[] = regionsData?.map((region: any) => ({
          id: region.id,
          name: region.name,
          areas: areasData
            .filter((area: any) => area.region_id === region.id)
            .map((area: any) => ({
              id: area.id,
              name: area.name,
              selected: userAreas.includes(area.id),
            }))
        })) || [];
        
        setRegions(regionsWithAreas);
      } catch (error: any) {
        console.error('Error fetching swap preferences data:', error);
        setError(error.message || 'Failed to load swap preferences');
        toast({
          title: 'Error',
          description: error.message || 'Failed to load swap preferences',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, toast]);
  
  const handleRegionToggle = (regionId: string, checked: CheckedState) => {
    // Update the regions state
    const updatedRegions = regions.map(region => {
      if (region.id === regionId) {
        // Toggle all areas within this region to match the region's checked state
        const updatedAreas = region.areas.map(area => ({
          ...area,
          selected: checked === true
        }));
        
        return {
          ...region,
          areas: updatedAreas
        };
      }
      return region;
    });
    
    setRegions(updatedRegions);
    
    // Update selected regions
    if (checked) {
      setSelectedRegions(prev => [...prev, regionId]);
      
      // Add all areas in this region to selectedAreas
      const areasInRegion = regions.find(r => r.id === regionId)?.areas.map(a => a.id) || [];
      setSelectedAreas(prev => [...prev, ...areasInRegion]);
    } else {
      setSelectedRegions(prev => prev.filter(id => id !== regionId));
      
      // Remove all areas in this region from selectedAreas
      const areasInRegion = regions.find(r => r.id === regionId)?.areas.map(a => a.id) || [];
      setSelectedAreas(prev => prev.filter(id => !areasInRegion.includes(id)));
    }
  };
  
  const handleAreaToggle = (regionId: string, areaId: string, checked: CheckedState) => {
    // Update the regions state
    const updatedRegions = regions.map(region => {
      if (region.id === regionId) {
        const updatedAreas = region.areas.map(area => {
          if (area.id === areaId) {
            return { ...area, selected: checked === true };
          }
          return area;
        });
        
        return { ...region, areas: updatedAreas };
      }
      return region;
    });
    
    setRegions(updatedRegions);
    
    // Update selected areas
    if (checked) {
      setSelectedAreas(prev => [...prev, areaId]);
    } else {
      setSelectedAreas(prev => prev.filter(id => id !== areaId));
    }
  };
  
  const savePreferences = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save preferences',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      console.log('Saving preferences for user:', user.id);
      console.log('Selected regions:', selectedRegions);
      console.log('Selected areas:', selectedAreas);
      
      // First, delete existing preferences for this user
      console.log('Deleting existing preferences...');
      const { error: deleteError } = await supabase
        .from('user_swap_preferences')
        .delete()
        .eq('user_id', user.id);
        
      if (deleteError) {
        console.error('Error deleting preferences:', deleteError);
        throw deleteError;
      }
      
      // Prepare data to insert
      const preferencesToInsert: UserSwapPreference[] = [];
      
      // Add region preferences
      selectedRegions.forEach(regionId => {
        preferencesToInsert.push({
          user_id: user.id,
          region_id: regionId,
          area_id: null
        });
      });
      
      // Add area preferences
      selectedAreas.forEach(areaId => {
        preferencesToInsert.push({
          user_id: user.id,
          region_id: null,
          area_id: areaId
        });
      });
      
      // Insert new preferences if there are any
      if (preferencesToInsert.length > 0) {
        console.log('Inserting new preferences:', preferencesToInsert);
        const { error: insertError } = await supabase
          .from('user_swap_preferences')
          .insert(preferencesToInsert);
          
        if (insertError) {
          console.error('Error inserting preferences:', insertError);
          throw insertError;
        }
      }
      
      toast({
        title: 'Success',
        description: 'Swap preferences saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving swap preferences:', error);
      setError(error.message || 'Failed to save swap preferences');
      toast({
        title: 'Error',
        description: error.message || 'Failed to save swap preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isRegionSelected = (regionId: string) => {
    return selectedRegions.includes(regionId);
  };
  
  const isAreaSelected = (areaId: string) => {
    return selectedAreas.includes(areaId);
  };
  
  // Determine if all areas in a region are selected
  const areAllAreasInRegionSelected = (regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    if (!region || region.areas.length === 0) return false;
    return region.areas.every(area => isAreaSelected(area.id));
  };

  // Handle accordion state changes
  const handleAccordionChange = (value: string) => {
    setOpenAccordion(value === openAccordion ? undefined : value);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to view swap preferences
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swap Preferences</CardTitle>
        <CardDescription>
          Select regions and areas you're willing to accept swaps from
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : regions.length === 0 ? (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No regions or areas are available. Please ask your administrator to add regions and areas in the system settings.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Accordion 
              type="single" 
              collapsible 
              className="space-y-2" 
              value={openAccordion}
              onValueChange={handleAccordionChange}
            >
              {regions.map((region) => (
                <AccordionItem key={region.id} value={region.id} className="border rounded-md overflow-hidden">
                  <div className="flex items-center p-3">
                    <Checkbox 
                      id={`region-${region.id}`}
                      checked={areAllAreasInRegionSelected(region.id)}
                      onCheckedChange={(checked) => handleRegionToggle(region.id, checked)}
                      className="mr-3"
                    />
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <label 
                        htmlFor={`region-${region.id}`} 
                        className="text-md font-medium cursor-pointer flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {region.name}
                      </label>
                    </AccordionTrigger>
                  </div>
                  
                  <AccordionContent className="px-3 pb-3">
                    {region.areas.length > 0 ? (
                      <div className="ml-8 grid gap-2">
                        {region.areas.map((area) => (
                          <div key={area.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`area-${area.id}`}
                              checked={isAreaSelected(area.id)}
                              onCheckedChange={(checked) => handleAreaToggle(region.id, area.id, checked)}
                            />
                            <label 
                              htmlFor={`area-${area.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {area.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ml-8 mt-2 text-sm text-gray-500 italic">
                        No areas available in this region
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <Button 
              className="w-full mt-4" 
              onClick={savePreferences}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
