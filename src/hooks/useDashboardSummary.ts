
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DashboardSummary {
  totalUsers: number;
  totalActiveSwaps: number;
}

export const useDashboardSummary = () => {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [totalActiveSwaps, setTotalActiveSwaps] = useState<number>(0);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState<boolean>(true);
  const { user, authChecked } = useAuth();

  useEffect(() => {
    const fetchUserCount = async () => {
      setIsLoadingUsers(true);
      try {
        console.log('Fetching user count...');
        // Use a count query without any filters to get all profiles
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error('Error fetching user count:', error);
          throw error;
        } else {
          console.log('Total profiles count:', count);
          setTotalUsers(count || 0);
        }
      } catch (error) {
        console.error('Error fetching user count:', error);
        setTotalUsers(0); // Set to 0 if there's an error
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const fetchTotalActiveSwaps = async () => {
      setIsLoadingSwaps(true);
      try {
        console.log('Fetching active swap requests...');
        // Get total count of active swap requests using RPC to bypass RLS
        const { data: swapRequestsData, error: requestsError } = await supabase
          .rpc('get_all_swap_requests');
          
        if (requestsError) {
          console.error('Error fetching all swap requests:', requestsError);
          throw requestsError;
        }
        
        // Filter to count only pending requests with preferred dates
        const activeSwapsCount = swapRequestsData?.filter(
          req => req.status === 'pending' && req.preferred_dates_count > 0
        ).length || 0;
        
        console.log('Total active swap requests:', activeSwapsCount);
        setTotalActiveSwaps(activeSwapsCount);
      } catch (error) {
        console.error('Error fetching active swap requests count:', error);
        setTotalActiveSwaps(0); // Set to 0 if there's an error
      } finally {
        setIsLoadingSwaps(false);
      }
    };

    // Only fetch data when auth is checked and user is logged in
    if (authChecked && user) {
      console.log('Auth checked and user logged in, fetching dashboard data...');
      fetchUserCount();
      fetchTotalActiveSwaps();
    } else if (authChecked) {
      // If auth is checked but no user, make sure loading states are reset
      console.log('Auth checked but no user logged in');
      setIsLoadingUsers(false);
      setIsLoadingSwaps(false);
    }
  }, [user, authChecked]);

  return {
    totalUsers,
    isLoadingUsers,
    totalActiveSwaps,
    isLoadingSwaps
  };
};
