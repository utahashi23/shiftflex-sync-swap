
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ColleagueType {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export const useColleagueTypes = () => {
  const [colleagueTypes, setColleagueTypes] = useState<ColleagueType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchColleagueTypes = async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('colleague_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setColleagueTypes(data || []);
    } catch (error) {
      console.error('Error fetching colleague types:', error);
      toast({
        title: "Error fetching colleague types",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchColleagueTypes();
  }, []);

  const addColleagueType = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('colleague_types')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;

      setColleagueTypes([...colleagueTypes, data]);
      toast({
        title: "Colleague Type Added",
        description: `"${name}" has been added successfully.`,
      });
      return true;
    } catch (error) {
      console.error('Error adding colleague type:', error);
      toast({
        title: "Error Adding Colleague Type",
        description: "Please try again later.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateColleagueType = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('colleague_types')
        .update({ name })
        .eq('id', id);

      if (error) throw error;

      setColleagueTypes(colleagueTypes.map(type => 
        type.id === id ? { ...type, name } : type
      ));

      toast({
        title: "Colleague Type Updated",
        description: `The colleague type has been updated successfully.`,
      });
      return true;
    } catch (error) {
      console.error('Error updating colleague type:', error);
      toast({
        title: "Error Updating Colleague Type",
        description: "Please try again later.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteColleagueType = async (id: string) => {
    try {
      const { error } = await supabase
        .from('colleague_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setColleagueTypes(colleagueTypes.filter(type => type.id !== id));
      toast({
        title: "Colleague Type Deleted",
        description: "The colleague type has been deleted successfully.",
      });
      return true;
    } catch (error) {
      console.error('Error deleting colleague type:', error);
      toast({
        title: "Error Deleting Colleague Type",
        description: "This colleague type may be in use. Please remove all references first.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    colleagueTypes,
    isLoading,
    isRefreshing,
    fetchColleagueTypes,
    addColleagueType,
    updateColleagueType,
    deleteColleagueType
  };
};
