
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/AppLayout';
import SwapListTable from '@/components/swaps-list/SwapListTable';
import SwapRequestFilters from '@/components/swaps-list/SwapRequestFilters';
import { SwapFilters, SwapListItem, useSwapList } from '@/hooks/useSwapList';

const SwapsList = () => {
  const { user } = useAuth();
  const {
    filteredRequests,
    isLoading,
    filters,
    setFilters,
    handleOfferSwap,
    refreshRequests
  } = useSwapList();
  
  // Initialize with empty filters, the useSwapList hook will handle the actual filtering
  const [localFilters, setLocalFilters] = useState<{
    date: Date | undefined;
    shiftType: string[];
  }>({
    date: undefined,
    shiftType: []
  });

  // Update filters in the useSwapList hook when localFilters change
  useEffect(() => {
    // Convert simplified UI filters to the full filter structure the hook expects
    if (localFilters.date) {
      const date = localFilters.date;
      setFilters({
        day: date.getDate(),
        month: date.getMonth() + 1, // JavaScript months are 0-indexed
        specificDate: date.toISOString().split('T')[0],
        shiftType: localFilters.shiftType.length > 0 ? localFilters.shiftType[0] : null,
        colleagueType: null
      });
    } else {
      setFilters({
        day: null,
        month: null,
        specificDate: null,
        shiftType: localFilters.shiftType.length > 0 ? localFilters.shiftType[0] : null,
        colleagueType: null
      });
    }
  }, [localFilters, setFilters]);

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
            filters={localFilters}
            setFilters={setLocalFilters}
          />
        </div>

        {/* Swap requests list */}
        <SwapListTable 
          requests={filteredRequests}
          onOffer={handleOfferSwap}
        />
      </div>
    </AppLayout>
  );
};

export default SwapsList;
