
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useUserCount = () => {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        setIsLoading(true);
        
        // Fetch count of users from auth.users via server function
        const { data, error, count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        
        if (error) throw error;
        
        setUserCount(count);
      } catch (error) {
        console.error('Error fetching user count:', error);
        toast({
          title: "Failed to load user count",
          description: "There was a problem loading the user count data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCount();
  }, []);

  return { userCount, isLoading };
};
