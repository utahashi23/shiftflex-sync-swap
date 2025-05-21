
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// General hook for system settings data loading
export const useSystemSettings = <T>(tableName: string) => {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setData(data || []);
    } catch (error: any) {
      console.error(`Error loading ${tableName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to load ${tableName}: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (name: string, additionalFields?: Record<string, any>) => {
    try {
      setIsRefreshing(true);
      const insertData = {
        name,
        ...additionalFields
      };
      
      const { error } = await supabase
        .from(tableName)
        .insert(insertData);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Added new item to ${tableName}`,
      });
      
      await fetchData();
    } catch (error: any) {
      console.error(`Error adding to ${tableName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to add item: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateItem = async (id: string, name: string, additionalFields?: Record<string, any>) => {
    try {
      setIsRefreshing(true);
      const updateData = {
        name,
        ...additionalFields
      };
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Updated item in ${tableName}`,
      });
      
      await fetchData();
    } catch (error: any) {
      console.error(`Error updating ${tableName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to update item: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      setIsRefreshing(true);
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Deleted item from ${tableName}`,
      });
      
      await fetchData();
    } catch (error: any) {
      console.error(`Error deleting from ${tableName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to delete item: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    data,
    isLoading,
    isRefreshing,
    fetchData,
    addItem,
    updateItem,
    deleteItem,
  };
};
