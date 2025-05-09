import { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Filter, LayoutList, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import AppLayout from '@/layouts/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useSwapList } from '@/hooks/useSwapList';
import SwapRequestFilters from '@/components/swaps-list/SwapRequestFilters';
import SwapListCard from '@/components/swaps-list/SwapListCard';
import SwapListTable from '@/components/swaps-list/SwapListTable';

const SwapsList = () => {
  const { isAdmin, user } = useAuth();
  const [view, setView] = useState<'card' | 'list'>('card');
  const { 
    swapRequests, 
    isLoading, 
    isLoadingMore,
    filteredRequests,
    totalFilteredCount,
    filters,
    setFilters,
    handleOfferSwap,
    loadMore,
    hasMore,
    refreshRequests,
    error
  } = useSwapList();

  // Implementation of infinite scrolling
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    
    if (node) {
      observer.current.observe(node);
    }
  }, [isLoadingMore, hasMore, loadMore]);

  // Force refresh on mount
  useEffect(() => {
    if (user) {
      refreshRequests();
    }
  }, [user]);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Swap Requests</h1>
        <p className="text-gray-500 mt-1">
          View and filter all available shift swap requests
          {isAdmin && <span className="ml-2 text-blue-500">(Admin View)</span>}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was a problem loading swap requests: {error.message}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={refreshRequests}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
          {filteredRequests.length > 0 ? (
            <>
              {view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRequests.map(request => (
                    <SwapListCard 
                      key={request.id}
                      request={request}
                      onOffer={() => handleOfferSwap(request.id)}
                    />
                  ))}
                  
                  {/* Loading indicator at the bottom */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="col-span-full py-4 flex justify-center">
                      {isLoadingMore ? (
                        <div className="flex flex-col items-center">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <p className="text-sm text-muted-foreground mt-2">Loading more...</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Scroll for more</p>
                      )}
                    </div>
                  )}
                  
                  {!hasMore && filteredRequests.length < totalFilteredCount && (
                    <div className="col-span-full py-4 flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={loadMore}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? "Loading..." : "Load More"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <SwapListTable 
                    requests={filteredRequests}
                    onOffer={handleOfferSwap}
                  />
                  
                  {/* Loading indicator for list view */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="py-4 flex justify-center">
                      {isLoadingMore ? (
                        <div className="flex flex-col items-center">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <p className="text-sm text-muted-foreground mt-2">Loading more...</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Scroll for more</p>
                      )}
                    </div>
                  )}
                  
                  {!hasMore && filteredRequests.length < totalFilteredCount && (
                    <div className="py-4 flex justify-center">
                      <Button 
                        variant="outline" 
                        onClick={loadMore}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? "Loading..." : "Load More"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
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
          )}
        </>
      )}
    </AppLayout>
  );
};

export default SwapsList;
