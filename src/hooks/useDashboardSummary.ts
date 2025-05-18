
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/auth';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardSummary {
  totalUsers: number;
}

export const useDashboardSummary = () => {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const { user } = useAuth();
  const fetchedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchUserCount = async () => {
      // Skip fetch if we've already done it for this user
      if (fetchedRef.current && userIdRef.current === user?.id) {
        return;
      }
      
      setIsLoadingUsers(true);
      
      try {
        userIdRef.current = user?.id || null;
        
        // Use a count query without any filters to get all profiles
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error('Error fetching user count:', error);
        } else {
          setTotalUsers(count || 0);
          fetchedRef.current = true;
        }
      } catch (error) {
        console.error('Error fetching user count:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (user) {
      fetchUserCount();
    }
  }, [user]);

  return {
    totalUsers,
    isLoadingUsers
  };
};
