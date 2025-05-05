
import { useState, useEffect } from 'react';
import { fetchAllSwapRequestsSafe, fetchAllPreferredDatesWithRequestsSafe } from '@/utils/rls-helpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapRequestWithDetails } from './types';

export const useMatchTesterData = (user: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [allRequests, setAllRequests] = useState<SwapRequestWithDetails[]>([]);
  const [allPreferredDates, setAllPreferredDates] = useState<any[]>([]);

  // Fetch all the data needed for testing
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all swap requests
      const { data: requestsData } = await fetchAllSwapRequestsSafe();
      
      console.log("Raw requests data:", requestsData?.length || 0, "requests found");
      
      // Fetch shift data for each request
      const enrichedRequests = await Promise.all((requestsData || []).map(async (request) => {
        // Get the shift data using the request's requester_shift_id
        const { data: shiftData } = await supabase.rpc('get_shift_by_id', { shift_id: request.requester_shift_id });
        
        // Get the user data
        const { data: userData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', request.requester_id)
          .single();
        
        return {
          ...request,
          shift_date: shiftData?.[0]?.date || 'Unknown',
          shift: shiftData?.[0] || {},
          user: userData || { first_name: 'Unknown', last_name: 'User' }
        };
      }));
      
      setAllRequests(enrichedRequests || []);
      
      // Fetch all preferred dates
      const { data: datesData } = await fetchAllPreferredDatesWithRequestsSafe();
      setAllPreferredDates(datesData || []);
      
      console.log("Fetched requests:", enrichedRequests?.length);
      console.log("Fetched preferred dates:", datesData?.length);
      
      // Log some debug info about the current user
      console.log("Current user:", user?.id);
      console.log("User requests:", enrichedRequests?.filter(r => r.requester_id === user?.id).length);
      
      // Log first few requests for debugging
      if (enrichedRequests?.length > 0) {
        console.log("Sample first request:", {
          id: enrichedRequests[0].id,
          requester_id: enrichedRequests[0].requester_id,
          status: enrichedRequests[0].status,
          shift_date: enrichedRequests[0].shift_date,
          preferred_dates_count: enrichedRequests[0].preferred_dates_count
        });
      }
      
      // Extra logging for demo1@maildrop.cc user
      if (user?.email === "demo1@maildrop.cc") {
        const userRequests = enrichedRequests?.filter(r => r.requester_id === user.id) || [];
        console.log(`Found ${userRequests.length} requests for demo1@maildrop.cc:`);
        userRequests.forEach((req, i) => {
          console.log(`Demo user request ${i+1}:`, {
            id: req.id,
            status: req.status,
            shift_date: req.shift_date,
            preferred_dates_count: req.preferred_dates_count
          });
        });
      }
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch test data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  return {
    isLoading,
    allRequests,
    allPreferredDates,
    fetchData
  };
};
