
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useOrganizations = () => {
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      
      // Get unique organization names from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('organization')
        .not('organization', 'is', null)
        .order('organization');
      
      if (error) throw error;
      
      // Extract unique organization names
      const uniqueOrgs = Array.from(new Set(
        data
          ?.map(item => item.organization)
          .filter(Boolean) as string[]
      ));
      
      setOrganizations(uniqueOrgs);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error fetching organizations",
        description: error.message || "Could not load organizations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOrganizations();
  }, []);
  
  return {
    organizations,
    isLoading,
    fetchOrganizations
  };
};
