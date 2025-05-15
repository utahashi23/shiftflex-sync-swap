
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Region {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useRegions = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRegions = async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');
          
      if (error) {
        throw error;
      }
      
      setRegions(data || []);
    } catch (error: any) {
      console.error('Error fetching regions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch regions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const addRegion = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .insert([{ name }])
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Region added successfully",
      });
      
      // Update the regions state with the new data
      await fetchRegions();
      return data[0];
    } catch (error: any) {
      console.error('Error adding region:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add region",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateRegion = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('regions')
        .update({ name })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Region updated successfully",
      });
      
      // Update the regions state
      await fetchRegions();
    } catch (error: any) {
      console.error('Error updating region:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update region",
        variant: "destructive"
      });
    }
  };

  const deleteRegion = async (id: string) => {
    try {
      // First check if there are any areas associated with this region
      const { data: areas, error: areasError } = await supabase
        .from('areas')
        .select('id')
        .eq('region_id', id);
        
      if (areasError) {
        throw areasError;
      }
      
      if (areas && areas.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "This region has areas associated with it. Delete these areas first.",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Region deleted successfully",
      });
      
      // Update the regions state
      await fetchRegions();
    } catch (error: any) {
      console.error('Error deleting region:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete region",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  return {
    regions,
    isLoading,
    isRefreshing,
    fetchRegions,
    addRegion,
    updateRegion,
    deleteRegion,
  };
};
