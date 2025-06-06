
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Area } from './useAreas';

export interface TruckName {
  id: string;
  name: string;
  area_id: string | null;
  status: string;
  created_at: string;
  address: string | null;
  area?: Area | null;
}

export const useTruckNamesAdmin = (areaId?: string) => {
  const [truckNames, setTruckNames] = useState<TruckName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTruckNames = async () => {
    try {
      setIsRefreshing(true);
      let query = supabase
        .from('truck_names')
        .select('*, areas(*, regions(name))')
        .eq('status', 'active')
        .order('name');

      if (areaId) {
        query = query.eq('area_id', areaId);
      }
        
      const { data, error } = await query;
          
      if (error) {
        throw error;
      }

      // Transform the data to properly handle the nested area and region properties
      const transformedData: TruckName[] = data.map((truck: any) => ({
        ...truck,
        area: truck.areas ? {
          ...truck.areas,
          region: truck.areas.regions ? {
            ...truck.areas.regions
          } : null
        } : null
      }));
      
      setTruckNames(transformedData || []);
    } catch (error: any) {
      console.error('Error fetching truck names:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch truck names",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const addTruckName = async (name: string, areaId: string | null, address: string | null = null) => {
    try {
      const { data, error } = await supabase
        .from('truck_names')
        .insert([{ name, area_id: areaId, address }])
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Truck name added successfully",
      });
      
      // Update the truck names state with the new data
      await fetchTruckNames();
      return data[0];
    } catch (error: any) {
      console.error('Error adding truck name:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add truck name",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateTruckName = async (id: string, name: string, areaId: string | null, address: string | null = null) => {
    try {
      const { error } = await supabase
        .from('truck_names')
        .update({ name, area_id: areaId, address })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Truck name updated successfully",
      });
      
      // Update the truck names state
      await fetchTruckNames();
    } catch (error: any) {
      console.error('Error updating truck name:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update truck name",
        variant: "destructive"
      });
    }
  };

  const deleteTruckName = async (id: string) => {
    try {
      const { error } = await supabase
        .from('truck_names')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Truck name deleted successfully",
      });
      
      // Update the truck names state
      await fetchTruckNames();
    } catch (error: any) {
      console.error('Error deleting truck name:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete truck name",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchTruckNames();
  }, [areaId]);

  return {
    truckNames,
    isLoading,
    isRefreshing,
    fetchTruckNames,
    addTruckName,
    updateTruckName,
    deleteTruckName,
  };
};
