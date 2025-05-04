
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardSummary {
  totalUsers: number;
  totalActiveSwaps: number;
}

export const useDashboardSummary = () => {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [totalActiveSwaps, setTotalActiveSwaps] = useState<number>(0);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserCount = async () => {
      setIsLoadingUsers(true);
      try {
        // Use a count query without any filters to get all profiles
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error('Error fetching user count:', error);
        } else {
          console.log('Total profiles count:', count);
          setTotalUsers(count || 0);
        }
      } catch (error) {
        console.error('Error fetching user count:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const fetchTotalActiveSwaps = async () => {
      setIsLoadingSwaps(true);
      try {
        // Get total count of active swap requests (pending with preferred dates)
        const { count, error } = await supabase
          .from('shift_swap_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gt('preferred_dates_count', 0);
          
        if (error) {
          console.error('Error fetching active swap requests count:', error);
        } else {
          console.log('Total active swap requests:', count);
          setTotalActiveSwaps(count || 0);
        }
      } catch (error) {
        console.error('Error fetching active swap requests count:', error);
      } finally {
        setIsLoadingSwaps(false);
      }
    };

    if (user) {
      fetchUserCount();
      fetchTotalActiveSwaps();
    }
  }, [user]);

  return {
    totalUsers,
    isLoadingUsers,
    totalActiveSwaps,
    isLoadingSwaps
  };
};
