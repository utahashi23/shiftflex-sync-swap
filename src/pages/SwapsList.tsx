
import { useState, useEffect } from 'react';
import { Calendar, Filter, LayoutList } from "lucide-react";
import { format } from "date-fns";
import AppLayout from '@/layouts/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from '@/hooks/useAuth';
import { useSwapList } from '@/hooks/useSwapList';
import SwapRequestFilters from '@/components/swaps-list/SwapRequestFilters';
import SwapListCard from '@/components/swaps-list/SwapListCard';
import SwapListTable from '@/components/swaps-list/SwapListTable';

const SwapsList = () => {
  const { isAdmin } = useAuth();
  const [view, setView] = useState<'card' | 'list'>('card');
  const { 
    swapRequests, 
    isLoading, 
    filteredRequests,
    filters,
    setFilters,
    handleOfferSwap
  } = useSwapList();

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Swap Requests</h1>
        <p className="text-gray-500 mt-1">
          View and filter all available shift swap requests
          {isAdmin && <span className="ml-2 text-blue-500">(Admin View)</span>}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
        <SwapRequestFilters filters={filters} setFilters={setFilters} />
        
        <div className="flex justify-end">
          <Tabs value={view} onValueChange={(v) => setView(v as 'card' | 'list')} className="w-[200px]">
            <TabsList>
              <TabsTrigger value="card" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Cards
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <LayoutList className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <Skeleton className="h-8 w-full rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {view === 'card' ? (
            filteredRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRequests.map(request => (
                  <SwapListCard 
                    key={request.id}
                    request={request}
                    onOffer={() => handleOfferSwap(request.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No swap requests match your filters</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setFilters({
                    day: null,
                    month: null,
                    specificDate: null,
                    shiftType: null,
                    colleagueType: null
                  })}
                >
                  Clear Filters
                </Button>
              </div>
            )
          ) : (
            <SwapListTable 
              requests={filteredRequests}
              onOffer={handleOfferSwap}
            />
          )}
        </>
      )}
    </AppLayout>
  );
};

export default SwapsList;
