
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
      
      // Fetch all regions - explicitly order by name and only select active regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .eq('status', 'active')
        .order('name');
        
      if (regionsError) throw regionsError;
      
      console.log('Regions fetched:', regionsData);
      
      // Fetch all areas - explicitly order by name and only select active areas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*, regions(name)')
        .eq('status', 'active')
        .order('name');
        
      if (areasError) throw areasError;
      
      console.log('Areas fetched:', areasData);
      
      // Get user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_swap_preferences')
        .select('*')
        .eq('user_id', user.id);
        
      if (preferencesError) {
        console.error('Error fetching preferences:', preferencesError);
        throw preferencesError;
      }
      
      console.log('User preferences fetched:', preferencesData);
      
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
          ?.filter((area: any) => area.region_id === region.id)
          .map((area: any) => ({
            id: area.id,
            name: area.name,
            selected: userAreas.includes(area.id),
          })) || []
      })) || [];
      
      setRegions(regionsWithAreas);
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
