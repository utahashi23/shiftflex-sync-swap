
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { user, authChecked } = useAuth();

  useEffect(() => {
    const fetchUserCount = async () => {
      setIsLoadingUsers(true);
      setConnectionError(null);
      try {
        console.log('Fetching user count...');
        
        // First check if the database connection is working
        try {
          // Use a simple lightweight query to test connection
          const { data: connectionTest, error: pingError } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true })
            .limit(1);
            
          if (pingError) {
            console.error('Database connection test failed:', pingError);
            setConnectionError(`Cannot connect to database: ${pingError.message}`);
            throw new Error(`Cannot connect to database: ${pingError.message}`);
          }
          console.log('Database connection test successful', connectionTest);
        } catch (pingErr: any) {
          console.error('Database ping error:', pingErr);
          setConnectionError(pingErr.message || 'Connection error');
          toast({
            title: "Database Connection Error",
            description: "Unable to connect to the database. Please check your connection.",
            variant: "destructive"
          });
          setIsLoadingUsers(false);
          return;
        }
        
        // Use a count query without any filters to get all profiles
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error('Error fetching user count:', error);
          setConnectionError(error.message);
          throw error;
        } else {
          console.log('Total profiles count:', count);
          setTotalUsers(count || 0);
        }
      } catch (error: any) {
        console.error('Error fetching user count:', error);
        setConnectionError(error.message || 'Unknown error');
        setTotalUsers(0); // Set to 0 if there's an error
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const fetchTotalActiveSwaps = async () => {
      setIsLoadingSwaps(true);
      try {
        console.log('Fetching active swap requests...');
        
        // First try using direct query to get swap requests
        const { data: swapData, error: swapError } = await supabase
          .from('shift_swap_requests')
          .select('id, status, preferred_dates_count')
          .eq('status', 'pending');
          
        if (swapError) {
          console.error('Error fetching swap requests:', swapError);
          setConnectionError(swapError.message);
          throw swapError;
        }
        
        // Count only pending requests with preferred dates
        const activeSwapsCount = swapData?.filter(
          req => req.preferred_dates_count > 0
        ).length || 0;
        
        console.log('Total active swap requests:', activeSwapsCount);
        setTotalActiveSwaps(activeSwapsCount);
      } catch (error: any) {
        console.error('Error fetching active swap requests count:', error);
        setConnectionError(error.message || 'Unknown error');
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
    isLoadingSwaps,
    connectionError
  };
};
