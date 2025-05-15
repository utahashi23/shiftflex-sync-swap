
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/AppLayout';
import SwapListTable from '@/components/swaps-list/SwapListTable';
import SwapRequestFilters from '@/components/swaps-list/SwapRequestFilters';

// Define the swap request type
interface SwapRequest {
  id: string;
  status: string;
  requester_id: string;
  requester_shift_id: string;
  created_at: string;
  updated_at: string;
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: 'day' | 'afternoon' | 'night';
  };
  preferred_dates: Array<{
    id: string;
    date: string;
    accepted_types: string[];
  }>;
}

// Define a simplified filter type compatible with SwapRequestFilters component
interface SimpleFilters {
  date: Date | undefined;
  shiftType: string[];
}

const SwapsList = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SimpleFilters>({
    date: undefined,
    shiftType: []
  });

  // Function to fetch swap requests
  const fetchSwapRequests = async () => {
    try {
      // We only want to fetch "pending" swap requests
      const { data, error } = await supabase.rpc('get_user_swap_requests_safe', {
        p_user_id: user?.id,
        p_status: 'pending'
      });

      if (error) throw error;
      return data as SwapRequest[];
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load swap requests',
        variant: 'destructive',
      });
      return [];
    }
  };

  const { data: swapRequests = [], isLoading } = useQuery({
    queryKey: ['swapRequests', user?.id],
    queryFn: fetchSwapRequests,
    enabled: !!user?.id,
  });

  // Sort swap requests by most recent date by default
  const sortedSwapRequests = React.useMemo(() => {
    return [...swapRequests].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [swapRequests]);

  // Filter swap requests
  const filteredSwapRequests = React.useMemo(() => {
    return sortedSwapRequests.filter(request => {
      // Filter by date if selected
      if (filters.date && request.shift) {
        const filterDate = filters.date.toISOString().split('T')[0];
        if (request.shift.date !== filterDate) {
          return false;
        }
      }

      // Filter by shift type if selected
      if (filters.shiftType.length > 0 && request.shift) {
        if (!filters.shiftType.includes(request.shift.type)) {
          return false;
        }
      }

      return true;
    });
  }, [sortedSwapRequests, filters]);

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Swap Requests</h1>
          <p className="text-gray-500 mt-1">View and filter all available shift swap requests</p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <SwapRequestFilters 
            filters={filters}
            setFilters={setFilters}
          />
        </div>

        {/* Swap requests list */}
        <SwapListTable 
          requests={filteredSwapRequests}
          isLoading={isLoading}
        />
      </div>
    </AppLayout>
  );
};

export default SwapsList;
