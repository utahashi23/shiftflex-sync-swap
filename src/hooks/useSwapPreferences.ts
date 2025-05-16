
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface RegionWithAreas {
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

// Define the interface for the RPC response
interface RegionAreaData {
  region_id: string;
  region_name: string;
  region_status: string;
  area_id: string | null;
  area_name: string | null;
  area_status: string | null;
  area_region_id: string | null;
}

export function useSwapPreferences() {
  const [regions, setRegions] = useState<RegionWithAreas[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch regions, areas, and user preferences
  const fetchData = async () => {
    if (!user) return;
    
    setError(null);
    try {
      console.log('Fetching swap preferences for user:', user.id);
      
      // Use supabase rpc now that our function is properly defined
      const { data: regionsAndAreas, error: regionsError } = await supabase
        .rpc('get_all_regions_and_areas');
      
      if (regionsError) {
        console.error('Error fetching regions and areas:', regionsError);
        throw regionsError;
      }
      
      console.log('Regions and areas data:', regionsAndAreas);
      
      // Transform the data
      const regionsMap = new Map<string, RegionWithAreas>();
      
      if (regionsAndAreas && Array.isArray(regionsAndAreas)) {
        // First pass: Create all regions
        regionsAndAreas.forEach((item: RegionAreaData) => {
          if (item.region_id && !regionsMap.has(item.region_id)) {
            regionsMap.set(item.region_id, {
              id: item.region_id,
              name: item.region_name,
              areas: []
            });
          }
        });
        
        // Second pass: Add all areas to their respective regions
        regionsAndAreas.forEach((item: RegionAreaData) => {
          if (item.area_id && item.region_id) {
            const region = regionsMap.get(item.region_id);
            if (region) {
              region.areas.push({
                id: item.area_id,
                name: item.area_name || 'Unnamed area',
                selected: false
              });
            }
          }
        });
      }
      
      const regionsArray = Array.from(regionsMap.values());
      console.log('Transformed regions data:', regionsArray);
      
      // Fetch user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .rpc('get_user_swap_preferences', { p_user_id: user.id });
        
      if (preferencesError) {
        console.error('Error fetching preferences via RPC:', preferencesError);
        
        // Fall back to direct query
        const { data: directPrefData, error: directPrefError } = await supabase
          .from('user_swap_preferences')
          .select('*')
          .eq('user_id', user.id);
          
        if (directPrefError) {
          console.error('Error with direct preferences query:', directPrefError);
          throw directPrefError;
        }
        
        console.log('User preferences fetched (direct):', directPrefData);
        processPreferences(regionsArray, directPrefData || []);
      } else {
        console.log('User preferences fetched (RPC):', preferencesData);
        processPreferences(regionsArray, preferencesData || []);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error fetching swap preferences data:', error);
      setError(error.message || 'Failed to load swap preferences');
      toast({
        title: 'Error',
        description: error.message || 'Failed to load swap preferences',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to process preferences
  const processPreferences = (regionsData: RegionWithAreas[], userPrefs: any[]) => {
    console.log('Processing preferences with:');
    console.log('Regions data:', regionsData);
    console.log('User preferences:', userPrefs);
    
    const userRegions: string[] = [];
    const userAreas: string[] = [];
    
    if (userPrefs && Array.isArray(userPrefs)) {
      userPrefs.forEach((pref) => {
        if (pref.region_id) userRegions.push(pref.region_id);
        if (pref.area_id) userAreas.push(pref.area_id);
      });
    }
    
    setSelectedRegions(userRegions);
    setSelectedAreas(userAreas);
    
    // Mark areas as selected based on user preferences
    const updatedRegions = regionsData.map(region => ({
      ...region,
      areas: region.areas.map(area => ({
        ...area,
        selected: userAreas.includes(area.id)
      }))
    }));
    
    setRegions(updatedRegions);
  };

  // Save preferences to the database
  const savePreferences = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save preferences',
        variant: 'destructive',
      });
      return { success: false };
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      console.log('Saving preferences for user:', user.id);
      console.log('Selected regions:', selectedRegions);
      console.log('Selected areas:', selectedAreas);
      
      // First, delete existing preferences for this user
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
      
      return { success: true };
    } catch (error: any) {
      console.error('Error saving swap preferences:', error);
      setError(error.message || 'Failed to save swap preferences');
      toast({
        title: 'Error',
        description: error.message || 'Failed to save swap preferences',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setIsSaving(false);
    }
  };

  // Utility functions for region/area selection
  const handleRegionToggle = (regionId: string, checked: boolean) => {
    // Update the regions state
    const updatedRegions = regions.map(region => {
      if (region.id === regionId) {
        // Toggle all areas within this region to match the region's checked state
        const updatedAreas = region.areas.map(area => ({
          ...area,
          selected: checked
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

  const handleAreaToggle = (regionId: string, areaId: string, checked: boolean) => {
    // Update the regions state
    const updatedRegions = regions.map(region => {
      if (region.id === regionId) {
        const updatedAreas = region.areas.map(area => {
          if (area.id === areaId) {
            return { ...area, selected: checked };
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

  const isRegionSelected = (regionId: string) => selectedRegions.includes(regionId);
  
  const isAreaSelected = (areaId: string) => selectedAreas.includes(areaId);
  
  // Determine if all areas in a region are selected
  const areAllAreasInRegionSelected = (regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    if (!region || region.areas.length === 0) return false;
    return region.areas.every(area => isAreaSelected(area.id));
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return {
    regions,
    selectedRegions,
    selectedAreas,
    isLoading,
    isSaving,
    error,
    fetchData,
    savePreferences,
    handleRegionToggle,
    handleAreaToggle,
    isRegionSelected,
    isAreaSelected,
    areAllAreasInRegionSelected,
  };
}
