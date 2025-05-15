
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Region } from './useRegions';

export interface Area {
  id: string;
  name: string;
  region_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  region?: Region;
}

export const useAreas = (regionId?: string) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAreas = async () => {
    try {
      setIsRefreshing(true);
      let query = supabase
        .from('areas')
        .select('*, regions(name)')
        .order('name');
        
      if (regionId) {
        query = query.eq('region_id', regionId);
      }
        
      const { data, error } = await query;
          
      if (error) {
        throw error;
      }

      // Transform the data to match the Area interface
      const transformedData: Area[] = data.map((area: any) => ({
        ...area,
        region: area.regions
      }));
      
      setAreas(transformedData || []);
    } catch (error: any) {
      console.error('Error fetching areas:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch areas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const addArea = async (name: string, regionId: string) => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .insert([{ name, region_id: regionId }])
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Area added successfully",
      });
      
      // Update the areas state with the new data
      await fetchAreas();
      return data[0];
    } catch (error: any) {
      console.error('Error adding area:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add area",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateArea = async (id: string, name: string, regionId: string) => {
    try {
      const { error } = await supabase
        .from('areas')
        .update({ name, region_id: regionId })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Area updated successfully",
      });
      
      // Update the areas state
      await fetchAreas();
    } catch (error: any) {
      console.error('Error updating area:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update area",
        variant: "destructive"
      });
    }
  };

  const deleteArea = async (id: string) => {
    try {
      // First check if there are any truck names associated with this area
      const { data: trucks, error: trucksError } = await supabase
        .from('truck_names')
        .select('id')
        .eq('area_id', id);
        
      if (trucksError) {
        throw trucksError;
      }
      
      if (trucks && trucks.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "This area has truck names associated with it. Update or delete these truck names first.",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Area deleted successfully",
      });
      
      // Update the areas state
      await fetchAreas();
    } catch (error: any) {
      console.error('Error deleting area:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete area",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchAreas();
  }, [regionId]);

  return {
    areas,
    isLoading,
    isRefreshing,
    fetchAreas,
    addArea,
    updateArea,
    deleteArea,
  };
};
