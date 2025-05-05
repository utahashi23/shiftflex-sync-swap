
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
      
      // Check if we got valid data - if not, show error
      if (!requestsData || requestsData.length === 0) {
        console.log("No swap requests found");
        toast({
          title: "No data available",
          description: "No swap requests were found in the system",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Fetch shift data for each request
      const enrichedRequests = await Promise.all((requestsData || []).map(async (request) => {
        // Get the shift data using the request's requester_shift_id
        const { data: shiftData } = await supabase.rpc('get_shift_by_id', { shift_id: request.requester_shift_id });
        
        // Get the user data
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', request.requester_id)
          .single();
        
        return {
          ...request,
          shift_date: shiftData?.[0]?.date || 'Unknown',
          shift: shiftData?.[0] || {},
          user: userData || { id: request.requester_id, first_name: 'Unknown', last_name: 'User' }
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
      
      // Log information about specific users that are having issues
      const troubleUserIds = [
        'dde7e6d2-5483-44eb-ae28-14e9062fea05',
        '96fc40f8-ceec-4ab2-80a6-3bd9fbf1cdd5'
      ];
      
      troubleUserIds.forEach(userId => {
        const userRequests = enrichedRequests?.filter(r => r.requester_id === userId) || [];
        console.log(`User ${userId} has ${userRequests.length} requests`);
        
        userRequests.forEach((req, i) => {
          const preferredDates = datesData?.filter(d => d.request_id === req.id) || [];
          console.log(`User ${userId} request ${i+1}:`, {
            id: req.id,
            status: req.status,
            shift_date: req.shift_date,
            preferred_dates_count: preferredDates.length,
            preferred_dates: preferredDates.map(d => d.date)
          });
        });
      });
      
      // Extra debugging for first few requests
      if (enrichedRequests?.length > 0) {
        console.log("Sample requests with shift dates and preferred dates:");
        for (let i = 0; i < Math.min(5, enrichedRequests.length); i++) {
          const req = enrichedRequests[i];
          const preferredDates = datesData?.filter(d => d.request_id === req.id) || [];
          console.log(`Request ${i+1}:`, {
            id: req.id,
            requester_id: req.requester_id,
            status: req.status,
            shift_date: req.shift_date,
            preferred_dates: preferredDates.map(d => d.date)
          });
        }
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
