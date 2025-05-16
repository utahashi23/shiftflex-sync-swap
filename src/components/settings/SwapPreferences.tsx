import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CheckedState } from '@radix-ui/react-checkbox';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { all } from '@/lib/utils';

interface RegionWithAreas {
  id: string;
  name: string;
  areas: {
    id: string;
    name: string;
    selected: boolean;
  }[];
  expanded: boolean;
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
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch regions, areas, and user preferences
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch all regions
        const { data: regionsData, error: regionsError } = await supabase
          .from('regions')
          .select('*')
          .eq('status', 'active')
          .order('name');
          
        if (regionsError) throw regionsError;
        
        // Fetch all areas
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*, regions(name)')
          .eq('status', 'active')
          .order('name');
          
        if (areasError) throw areasError;
        
        // Fetch user preferences directly from the table
        const { data: preferencesData, error: preferencesError } = await supabase
          .from('user_swap_preferences')
          .select('*')
          .eq('user_id', user.id);
          
        if (preferencesError) {
          throw preferencesError;
        }
        
        // Extract user's selected regions and areas
        const userRegions: string[] = [];
        const userAreas: string[] = [];
        
        if (preferencesData && Array.isArray(preferencesData)) {
          preferencesData.forEach((pref) => {
            if (pref.region_id) userRegions.push(pref.region_id);
            if (pref.area_id) userAreas.push(pref.area_id);
          });
        }
        
        setSelectedRegions(userRegions);
        setSelectedAreas(userAreas);
        
        // Transform data for the component
        const regionsWithAreas: RegionWithAreas[] = regionsData.map((region: any) => ({
          id: region.id,
          name: region.name,
          areas: areasData
            .filter((area: any) => area.region_id === region.id)
            .map((area: any) => ({
              id: area.id,
              name: area.name,
              selected: userAreas.includes(area.id),
            })),
          expanded: false
        }));
        
        setRegions(regionsWithAreas);
      } catch (error: any) {
        console.error('Error fetching swap preferences data:', error);
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
  
  const toggleRegionExpanded = (regionId: string) => {
    setRegions(regions.map(region => 
      region.id === regionId 
        ? { ...region, expanded: !region.expanded } 
        : region
    ));
  };
  
  const savePreferences = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // First, delete existing preferences for this user
      const { error: deleteError } = await supabase
        .from('user_swap_preferences')
        .delete()
        .eq('user_id', user.id);
        
      if (deleteError) throw deleteError;
      
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
        const { error: insertError } = await supabase
          .from('user_swap_preferences')
          .insert(preferencesToInsert);
          
        if (insertError) throw insertError;
      }
      
      toast({
        title: 'Success',
        description: 'Swap preferences saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving swap preferences:', error);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swap Preferences</CardTitle>
        <CardDescription>
          Select regions and areas you're willing to accept swaps from
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {regions.map((region) => (
              <div key={region.id} className="border rounded-md p-3">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id={`region-${region.id}`}
                    checked={areAllAreasInRegionSelected(region.id)}
                    onCheckedChange={(checked) => handleRegionToggle(region.id, checked)}
                  />
                  <label 
                    htmlFor={`region-${region.id}`} 
                    className="text-md font-medium flex-1 cursor-pointer"
                  >
                    {region.name}
                  </label>
                  <Button
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleRegionExpanded(region.id)}
                    className="h-8 w-8 p-0"
                  >
                    {region.expanded ? (
                      <span className="sr-only">Collapse</span>
                    ) : (
                      <span className="sr-only">Expand</span>
                    )}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`h-4 w-4 transition-transform ${
                        region.expanded ? 'rotate-180' : ''
                      }`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </Button>
                </div>
                
                {region.expanded && region.areas.length > 0 && (
                  <div className="ml-8 mt-2 grid gap-2">
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
                )}
                
                {region.expanded && region.areas.length === 0 && (
                  <div className="ml-8 mt-2 text-sm text-gray-500 italic">
                    No areas available in this region
                  </div>
                )}
              </div>
            ))}
            
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
