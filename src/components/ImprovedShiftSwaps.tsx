
import React, { useState, useEffect } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSwapRequests } from '@/hooks/useSwapRequests';
import { SwapFiltersDialog, SwapFilters } from '@/components/swaps/SwapFiltersDialog';
import { RegionPreferencesButton } from '@/components/swaps/RegionPreferencesButton';
import { ImprovedSwapForm } from '@/components/swaps/ImprovedSwapForm';
import SwapRequestCard from '@/components/swaps/SwapRequestCard';
import SwapRequestSkeleton from '@/components/swaps/SwapRequestSkeleton';
import EmptySwapRequests from '@/components/swaps/EmptySwapRequests';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ImprovedShiftSwaps = () => {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState<SwapFilters>({
    sortDirection: 'asc',
    dateRange: { from: undefined, to: undefined },
    truckName: null,
    shiftType: null,
  });

  const { 
    requests: swapRequests, 
    isLoading, 
    error, 
    fetchRequests: refreshRequests,
    createSwapRequest
  } = useSwapRequests();

  // Mock available trucks for now - this should come from a proper hook later
  const availableTrucks = [];

  // Apply filters to swap requests
  const filteredRequests = React.useMemo(() => {
    if (!swapRequests) return [];
    
    let filtered = [...swapRequests];
    
    // Filter by date range
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(request => {
        const requestDate = new Date(request.shift_date);
        const fromDate = filters.dateRange.from;
        const toDate = filters.dateRange.to;
        
        if (fromDate && toDate) {
          return requestDate >= fromDate && requestDate <= toDate;
        } else if (fromDate) {
          return requestDate >= fromDate;
        } else if (toDate) {
          return requestDate <= toDate;
        }
        return true;
      });
    }
    
    // Filter by truck name
    if (filters.truckName) {
      filtered = filtered.filter(request => request.truck_name === filters.truckName);
    }
    
    // Filter by shift type
    if (filters.shiftType) {
      filtered = filtered.filter(request => request.shift_type === filters.shiftType);
    }
    
    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.shift_date);
      const dateB = new Date(b.shift_date);
      return filters.sortDirection === 'asc' 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });
    
    return filtered;
  }, [swapRequests, filters]);

  const handleApplyFilters = (newFilters: SwapFilters) => {
    setFilters(newFilters);
  };

  const handleFormSubmit = async (shiftIds: string[], wantedDates: string[], acceptedTypes: string[], requiredSkillset?: string[]) => {
    const success = await createSwapRequest(shiftIds, wantedDates, acceptedTypes, requiredSkillset);
    if (success) {
      setIsFormOpen(false);
      refreshRequests();
    }
    return success;
  };

  const previousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading swap requests: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with month navigation - full width like /roster-2 */}
      <div className="flex items-center justify-between w-full">
        <Button
          variant="outline"
          onClick={previousMonth}
          className="flex-1 mr-2"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous Month
        </Button>
        
        <div className="flex-2 text-center px-4">
          <h2 className="text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        
        <Button
          variant="outline"
          onClick={nextMonth}
          className="flex-1 ml-2"
        >
          Next Month
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Request Shift Swap
          </Button>
        </div>
        
        {/* Filter and Region buttons - moved next to each other */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsFiltersOpen(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {(filters.dateRange.from || filters.dateRange.to || filters.truckName || filters.shiftType) && (
              <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                Active
              </Badge>
            )}
          </Button>
          <RegionPreferencesButton />
        </div>
      </div>

      {/* Swap requests list */}
      <Card>
        <CardHeader>
          <CardTitle>
            Your Swap Requests
            {filteredRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SwapRequestSkeleton key={i} />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptySwapRequests onCreateRequest={() => setIsFormOpen(true)} />
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <SwapRequestCard
                  key={request.id}
                  request={request}
                  onDelete={refreshRequests}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ImprovedSwapForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        currentMonth={currentMonth}
        filters={filters}
      />

      <SwapFiltersDialog
        isOpen={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        availableTrucks={availableTrucks || []}
      />
    </div>
  );
};

export default ImprovedShiftSwaps;
