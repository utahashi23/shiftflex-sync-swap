
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
        // Get total count of active swap requests across all users
        // Use the RPC function to bypass RLS issues and get a complete view
        const { data: swapRequestsData, error: requestsError } = await supabase
          .rpc('get_all_swap_requests');
          
        if (requestsError) {
          console.error('Error fetching all swap requests:', requestsError);
          throw requestsError;
        }
        
        // Filter to count only pending requests with preferred dates across ALL users
        const activeSwapsCount = swapRequestsData?.filter(
          req => req.status === 'pending' && req.preferred_dates_count > 0
        ).length || 0;
        
        console.log('Total active swap requests across all users:', activeSwapsCount);
        setTotalActiveSwaps(activeSwapsCount);
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
