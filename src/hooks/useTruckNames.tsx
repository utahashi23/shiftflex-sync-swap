
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useTruckNames = () => {
  const [truckNames, setTruckNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTruckNames = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('truck_names')
          .select('name')
          .eq('status', 'active')
          .order('name');
          
        if (error) {
          throw error;
        }
        
        // Extract names from the data
        const names = data?.map(item => item.name) || [];
        setTruckNames(names);
      } catch (error) {
        console.error('Error fetching truck names:', error);
        // Fall back to default truck names if fetch fails
        setTruckNames([
          "02-MAT01", "02-MAT02", "04-MAT03", "04-MAT04", "04-MAT05", 
          "04-MAT06", "04-MAT17", "06-MAT07", "06-MAT08", "06-MAT09"
        ]);
        toast({
          title: "Warning",
          description: "Using default truck names - could not fetch from database.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTruckNames();
  }, []);

  return { truckNames, isLoading };
};
