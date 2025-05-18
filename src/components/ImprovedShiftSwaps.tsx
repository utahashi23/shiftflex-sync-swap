import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImprovedSwapForm } from "./swaps/ImprovedSwapForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RegionPreferencesButton } from "./swaps/RegionPreferencesButton";
import SwapRequestCard from "./swaps/SwapRequestCard";
import { useSwapRequests } from "@/hooks/swap-requests";
import { MatchedSwapsTabs } from "./matched-swaps/MatchedSwapsTabs";
import { SwapMatch as ComponentSwapMatch } from "./matched-swaps/types";
import { SwapMatch as HookSwapMatch } from "@/hooks/swap-matches/types";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth,
  isAfter,
  isBefore,
  isEqual,
  parseISO 
} from 'date-fns';
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ChevronLeft, ChevronRight, Trash2, Filter } from 'lucide-react';
import { cn } from "@/lib/utils";
import SwapDeleteDialog from "./swaps/SwapDeleteDialog";
import { SwapFiltersDialog, SwapFilters } from "./swaps/SwapFiltersDialog";
import { getShiftType } from "@/utils/shiftUtils";

// Adapter function to convert between swap match types
function adaptSwapMatches(matches: HookSwapMatch[]): ComponentSwapMatch[] {
  return matches.map(match => ({
    ...match,
    myShift: {
      ...match.myShift,
      truckName: match.myShift.truckName || null, // Ensure truckName is not undefined
      // Ensure type is one of the allowed types
      type: (match.myShift.type === 'day' || match.myShift.type === 'afternoon' || 
             match.myShift.type === 'night') ? match.myShift.type : 'unknown'
    },
    otherShift: {
      ...match.otherShift,
      truckName: match.otherShift.truckName || null, // Ensure truckName is not undefined
      // Ensure type is one of the allowed types
      type: (match.otherShift.type === 'day' || match.otherShift.type === 'afternoon' || 
             match.otherShift.type === 'night') ? match.otherShift.type : 'unknown'
    }
  }));
}

const ImprovedShiftSwaps = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    matches: hookMatches, 
    pastMatches: hookPastMatches, 
    isLoading: isMatchesLoading, 
    refreshMatches,
    createSwapRequest,
    fetchSwapRequests: hookFetchSwapRequests
  } = useSwapRequests();

  // New state for month-based navigation - now used for both tabs
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // New state for selected requests (for multiple deletion)
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  
  // Filters state - now shared between both tabs
  const [filters, setFilters] = useState<SwapFilters>({
    sortDirection: 'asc',
    dateRange: { from: undefined, to: undefined },
    truckName: null,
    shiftType: null
  });
  
  // State for filter dialog - now used for both tabs
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Add new state to track which tab is using the filter dialog
  const [filteringTab, setFilteringTab] = useState<'create' | 'mySwaps'>('mySwaps');
  
  // State to track available truck names for filtering
  const [availableTrucks, setAvailableTrucks] = useState<string[]>([]);
  
  // New state for delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean, 
    requestId: string | null,
    isMultiple: boolean,
    isDeleting: boolean
  }>({
    isOpen: false,
    requestId: null,
    isMultiple: false,
    isDeleting: false
  });

  // Convert hook match types to component match types
  const matches = adaptSwapMatches(hookMatches || []);
  const pastMatches = adaptSwapMatches(hookPastMatches || []);
  
  // Add extra logging to help diagnose match issues
  useEffect(() => {
    if (hookMatches) {
      console.log("Current match count:", hookMatches.length);
      if (hookMatches.length > 0) {
        console.log("Sample match:", hookMatches[0]);
      } else {
        console.log("No matches found - check matching logic");
      }
    }
  }, [hookMatches]);

  // Fetch user's swap requests
  const fetchUserRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log("Fetching user swap requests for user:", user.id);
      // Query the improved_shift_swaps table instead of shift_swap_requests
      const { data, error } = await supabase
        .from("improved_shift_swaps")
        .select("*, shifts(*)")
        .eq("requester_id", user.id);
        
      if (error) throw error;
      
      console.log("Fetched user swap requests:", data);
      setUserRequests(data || []);
      
      // Extract unique truck names from the data
      const uniqueTruckNames = Array.from(
        new Set(
          (data || [])
            .filter(request => request.shifts?.truck_name)
            .map(request => request.shifts.truck_name)
        )
      ).sort();
      
      setAvailableTrucks(uniqueTruckNames as string[]);
      
    } catch (err: any) {
      console.error("Error fetching swap requests:", err);
      toast({
        title: "Error",
        description: "Failed to load your swap requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch requests when the component mounts, user changes, or active tab changes to "mySwaps"
  useEffect(() => {
    if (user) {
      fetchUserRequests();
      // Also fetch from the hook to ensure both data sources are up to date
      hookFetchSwapRequests();
    }
  }, [user]);

  // Refresh user requests when the "mySwaps" tab becomes active
  useEffect(() => {
    if (activeTab === "mySwaps" && user) {
      console.log("mySwaps tab activated, refreshing requests");
      fetchUserRequests();
      // Also refresh from the hook
      hookFetchSwapRequests();
    } else if (activeTab === "matches" && user) {
      console.log("matches tab activated, refreshing matches");
      refreshMatches();
    }
  }, [activeTab, user]);
  
  // Handle creating a swap request
  const handleCreateSwap = async (shiftIds: string[], wantedDates: string[], acceptedTypes: string[]) => {
    setIsSubmitting(true);
    try {
      console.log("Creating swap request with: ", { shiftIds, wantedDates, acceptedTypes });
      
      const success = await createSwapRequest(shiftIds, wantedDates, acceptedTypes);
      
      if (success) {
        toast({
          title: "Success",
          description: "Swap request created successfully",
        });
        
        console.log("Swap created successfully, now fetching updated requests");
        
        // Reload the user's swap requests immediately after creation
        await Promise.all([
          fetchUserRequests(),
          hookFetchSwapRequests()
        ]);
        
        // Switch to the "My Swaps" tab after creating a swap
        setActiveTab("mySwaps");
      } else {
        throw new Error("Failed to create swap request");
      }
      
      return success;
    } catch (err: any) {
      console.error("Error creating swap request:", err);
      toast({
        title: "Error",
        description: "Failed to create swap request",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  // Toggle request selection
  const toggleRequestSelection = (requestId: string) => {
    setSelectedRequests(prev => 
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  // Apply filters
  const handleApplyFilters = (newFilters: SwapFilters) => {
    setFilters(newFilters);
  };

  // Open filter dialog - update to handle different tabs
  const openFiltersDialog = (tab: 'create' | 'mySwaps') => {
    setFilteringTab(tab);
    setIsFiltersOpen(true);
  };

  // Open delete dialog for multiple requests
  const openDeleteMultipleDialog = () => {
    if (selectedRequests.length === 0) return;
    
    setDeleteDialog({
      isOpen: true,
      requestId: null,
      isMultiple: true,
      isDeleting: false
    });
  };

  // Handle delete request
  const handleDeleteRequest = async (requestId: string) => {
    // Open delete dialog for single request
    setDeleteDialog({
      isOpen: true,
      requestId,
      isMultiple: false,
      isDeleting: false
    });
  };

  // Handle confirm delete (for both single and multiple)
  const handleConfirmDelete = async () => {
    try {
      setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
      
      if (deleteDialog.isMultiple) {
        // Delete multiple requests
        for (const requestId of selectedRequests) {
          // Delete from the improved_shift_swaps table
          const { error } = await supabase
            .from("improved_shift_swaps")
            .delete()
            .eq("id", requestId);
            
          if (error) throw error;
          
          // Also delete related records from improved_swap_wanted_dates
          await supabase
            .from("improved_swap_wanted_dates")
            .delete()
            .eq("swap_id", requestId);
        }
        
        // Clear selected requests
        setSelectedRequests([]);
      } else if (deleteDialog.requestId) {
        // Delete a single request
        const { error } = await supabase
          .from("improved_shift_swaps")
          .delete()
          .eq("id", deleteDialog.requestId);
          
        if (error) throw error;
        
        // Also delete related records from improved_swap_wanted_dates
        await supabase
          .from("improved_swap_wanted_dates")
          .delete()
          .eq("swap_id", deleteDialog.requestId);
      }
      
      // First update the local state for immediate UI feedback
      if (deleteDialog.isMultiple) {
        setUserRequests(userRequests.filter(request => !selectedRequests.includes(request.id)));
      } else if (deleteDialog.requestId) {
        setUserRequests(userRequests.filter(request => request.id !== deleteDialog.requestId));
      }
      
      toast({
        title: "Success",
        description: deleteDialog.isMultiple 
          ? `${selectedRequests.length} swap requests deleted successfully`
          : "Swap request deleted successfully",
      });
      
      // Then refresh both data sources to ensure consistency
      console.log("Swap(s) deleted, refreshing requests lists");
      await Promise.all([
        fetchUserRequests(),
        hookFetchSwapRequests()
      ]);
      
    } catch (err: any) {
      console.error("Error deleting swap request(s):", err);
      toast({
        title: "Error",
        description: "Failed to delete swap request(s)",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ isOpen: false, requestId: null, isMultiple: false, isDeleting: false });
    }
  };

  // Filter and sort requests based on all filters
  const filteredAndSortedRequests = userRequests
    .filter(request => {
      const shiftDate = request.shifts?.date ? new Date(request.shifts.date) : null;
      if (!shiftDate) return false;
      
      // Month filter (always applied)
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const isInCurrentMonth = shiftDate >= monthStart && shiftDate <= monthEnd;
      if (!isInCurrentMonth) return false;
      
      // Date range filter
      if (filters.dateRange.from && filters.dateRange.to) {
        // Ensure dates are at the start of day for accurate comparison
        const isInDateRange = 
          (isEqual(shiftDate, filters.dateRange.from) || isAfter(shiftDate, filters.dateRange.from)) &&
          (isEqual(shiftDate, filters.dateRange.to) || isBefore(shiftDate, filters.dateRange.to));
        if (!isInDateRange) return false;
      } else if (filters.dateRange.from) {
        if (isBefore(shiftDate, filters.dateRange.from)) return false;
      } else if (filters.dateRange.to) {
        if (isAfter(shiftDate, filters.dateRange.to)) return false;
      }
      
      // Truck name filter
      if (filters.truckName && request.shifts?.truck_name !== filters.truckName) {
        return false;
      }
      
      // Shift type filter
      if (filters.shiftType) {
        const shiftType = request.shifts?.start_time
          ? getShiftType(request.shifts.start_time)
          : 'day';
        if (shiftType !== filters.shiftType) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = a.shifts?.date ? new Date(a.shifts.date) : new Date(0);
      const dateB = b.shifts?.date ? new Date(b.shifts.date) : new Date(0);
      
      return filters.sortDirection === 'asc' 
        ? dateA.getTime() - dateB.getTime() 
        : dateB.getTime() - dateA.getTime();
    });

  // Check if any requests are selected
  const hasSelectedRequests = selectedRequests.length > 0;
  
  // Check if any filters are applied beyond default sort
  const hasActiveFilters = 
    filters.dateRange.from !== undefined || 
    filters.dateRange.to !== undefined || 
    filters.truckName !== null || 
    filters.shiftType !== null;

  // Month navigation component that can be reused
  const MonthNavigation = () => (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={goToPreviousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous Month</span>
      </Button>
      <h2 className="text-[0.85rem] font-medium">
        {format(currentMonth, 'MMMM yyyy')}
      </h2>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={goToNextMonth}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next Month</span>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <RegionPreferencesButton />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Swap</TabsTrigger>
          <TabsTrigger value="mySwaps">My Swaps</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="mt-6 space-y-4">
          {/* Updated Create Swap tab with filter button */}
          <div className="flex items-center justify-between mb-4">
            <MonthNavigation />
            
            {/* Add Filter button to Create Swap tab */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openFiltersDialog('create')}
                className={cn(
                  "flex items-center space-x-1",
                  hasActiveFilters ? "bg-blue-50 text-blue-700" : ""
                )}
              >
                <Filter className="h-3 w-3 mr-1" />
                <span className="text-[0.85rem]">Filter</span>
                {hasActiveFilters && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-blue-500"></span>
                )}
              </Button>
            </div>
          </div>
          
          <div className="grid gap-6">
            <ImprovedSwapForm
              isOpen={true}
              onClose={() => {}}
              onSubmit={handleCreateSwap}
              isDialog={false}
              currentMonth={currentMonth}
              filters={filters} // Pass filters to the form
            />
          </div>
        </TabsContent>
        
        <TabsContent value="mySwaps" className="mt-6">
          {/* Month navigation and controls */}
          <div className="flex items-center justify-between mb-4">
            <MonthNavigation />
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openFiltersDialog('mySwaps')}
                className={cn(
                  "flex items-center space-x-1",
                  hasActiveFilters ? "bg-blue-50 text-blue-700" : ""
                )}
              >
                <Filter className="h-3 w-3 mr-1" />
                <span className="text-[0.85rem]">Filter</span>
                {hasActiveFilters && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-blue-500"></span>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={openDeleteMultipleDialog}
                disabled={!hasSelectedRequests}
                className={cn(
                  "flex items-center space-x-1",
                  hasSelectedRequests ? "bg-red-50 hover:bg-red-100 text-red-700" : ""
                )}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                <span className="text-[0.85rem]">Delete Selected</span>
              </Button>
            </div>
          </div>
          
          {/* Keep existing code for My Swaps tab */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredAndSortedRequests.map((request) => (
              <div key={request.id} className="flex-1">
                <SwapRequestCard
                  key={request.id}
                  request={request}
                  onDelete={() => handleDeleteRequest(request.id)}
                  showCheckbox={true}
                  isSelected={selectedRequests.includes(request.id)}
                  onToggleSelect={() => toggleRequestSelection(request.id)}
                />
              </div>
            ))}
            
            {filteredAndSortedRequests.length === 0 && !isLoading && (
              <div className="col-span-2 bg-muted/30 p-6 rounded-lg text-center">
                <h3 className="font-medium mb-2">No Swap Requests</h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters 
                    ? "No swap requests match the current filters."
                    : "You haven't created any swap requests for this month. Go to the \"Create Swap Request\" tab to get started."}
                </p>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setFilters({
                      sortDirection: 'asc',
                      dateRange: { from: undefined, to: undefined },
                      truckName: null,
                      shiftType: null
                    })}
                    className="mt-2"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            )}
            
            {isLoading && (
              <div className="col-span-2 flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="matches" className="mt-6">
          {/* ... keep existing code (matches tab) */}
          <MatchedSwapsTabs
            activeTab="active"
            setActiveTab={() => {}}
            matches={matches}
            pastMatches={pastMatches}
            onAcceptSwap={(matchId) => console.log("Accept swap:", matchId)}
            onFinalizeSwap={(matchId) => console.log("Finalize swap:", matchId)}
            onCancelSwap={(matchId) => console.log("Cancel swap:", matchId)}
            onResendEmail={(matchId) => console.log("Resend email for swap:", matchId)}
            onRefresh={refreshMatches}
            isLoading={isMatchesLoading}
          />
        </TabsContent>
      </Tabs>
      
      {/* ... keep existing code (delete dialog) */}
      <SwapDeleteDialog
        isOpen={deleteDialog.isOpen}
        isLoading={deleteDialog.isDeleting}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteDialog({ isOpen: false, requestId: null, isMultiple: false, isDeleting: false });
          } else {
            setDeleteDialog(prev => ({ ...prev, isOpen: true }));
          }
        }}
        onDelete={handleConfirmDelete}
        isDateOnly={false}
        isMultiDelete={deleteDialog.isMultiple}
        selectionCount={selectedRequests.length}
      />
      
      {/* Filter dialog - now used by both tabs */}
      <SwapFiltersDialog
        isOpen={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        availableTrucks={availableTrucks}
      />
    </div>
  );
};

export default ImprovedShiftSwaps;
