
import { useState, useEffect, useMemo } from "react";
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
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { cn } from "@/lib/utils";
import SwapDeleteDialog from "./swaps/SwapDeleteDialog";
import { SwapFiltersDialog, SwapFilters } from "./swaps/SwapFiltersDialog";
import { getShiftType } from "@/utils/shiftUtils";
import { DeletePreferredDateResult } from "@/hooks/swap-requests/types";

// Interface for grouped swap requests - new interface to better handle grouping
interface GroupedSwapRequest {
  shiftDate: string;
  shiftId: string;
  requests: any[];
  truckName?: string;
  startTime?: string;
  endTime?: string;
  colleagueType?: string;
  shiftType?: string;
}

// Adapter function to convert between swap match types
function adaptSwapMatches(matches: HookSwapMatch[]): ComponentSwapMatch[] {
  return matches.map(match => ({
    ...match,
    myShift: {
      ...match.myShift,
      truckName: match.myShift.truckName || null,
      type: (match.myShift.type === 'day' || match.myShift.type === 'afternoon' || 
             match.myShift.type === 'night') ? match.myShift.type : 'unknown'
    },
    otherShift: {
      ...match.otherShift,
      truckName: match.otherShift.truckName || null,
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
  
  // Get the hook data
  const { 
    requests,
    isLoading: isMatchesLoading, 
    fetchRequests,
    deleteRequest,
    deletePreferredDate,
    createSwapRequest,
    fetchSwapRequests,
    refreshMatches,
    deleteSwapRequest,
    deletePreferredDay
  } = useSwapRequests();

  // Get matches data directly from the requests based on status
  const swapMatches = requests?.filter(r => r.status === 'matched' || r.status === 'accepted' || r.status === 'confirmed') || [];
  const swapPastMatches = requests?.filter(r => r.status === 'completed') || [];
  
  // Convert to component match format
  const componentMatches = adaptSwapMatches(swapMatches as any);
  const componentPastMatches = adaptSwapMatches(swapPastMatches as any);

  // State for month-based navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Filters state
  const [filters, setFilters] = useState<SwapFilters>({
    sortDirection: 'asc',
    dateRange: { from: undefined, to: undefined },
    truckName: null,
    shiftType: null
  });
  
  // State for filter dialog
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // State to track which tab is using the filter dialog
  const [filteringTab, setFilteringTab] = useState<'create' | 'mySwaps'>('mySwaps');
  
  // State to track available truck names for filtering
  const [availableTrucks, setAvailableTrucks] = useState<string[]>([]);
  
  // State for delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean, 
    requestId: string | null,
    dayId: string | null,
    isDeleting: boolean
  }>({
    isOpen: false,
    requestId: null,
    dayId: null,
    isDeleting: false
  });

  // Group swap requests by shift date - using useMemo to compute this derived state
  const groupedSwapRequests = useMemo(() => {
    if (!userRequests || userRequests.length === 0) {
      return [];
    }
    
    // First filter and sort the requests based on current filters
    const filteredRequests = userRequests
      .filter(request => {
        // Check if the request has shift data
        if (!request.shifts?.date) {
          return false;
        }
        
        const shiftDate = new Date(request.shifts.date);
        
        // Filter by current month
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        
        return shiftDate >= monthStart && shiftDate <= monthEnd;
      })
      .sort((a, b) => {
        // Sort by shift date
        const dateA = a.shifts?.date ? new Date(a.shifts.date) : new Date(0);
        const dateB = b.shifts?.date ? new Date(b.shifts.date) : new Date(0);
        
        return filters.sortDirection === 'asc' 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      });
      
    // Group requests by shift date
    const groupedByDate: Record<string, GroupedSwapRequest> = {};
    
    filteredRequests.forEach(request => {
      if (!request.shifts?.date) return;
      
      const shiftDate = request.shifts.date;
      
      if (!groupedByDate[shiftDate]) {
        groupedByDate[shiftDate] = {
          shiftDate,
          shiftId: request.shifts.id,
          requests: [],
          truckName: request.shifts?.truck_name,
          startTime: request.shifts?.start_time,
          endTime: request.shifts?.end_time,
          colleagueType: request.shifts?.colleagueType,
          shiftType: request.shifts?.start_time
            ? getShiftType(request.shifts.start_time)
            : 'day'
        };
      }
      
      groupedByDate[shiftDate].requests.push(request);
    });
    
    // Convert the grouped object to an array for rendering
    return Object.values(groupedByDate);
  }, [userRequests, currentMonth, filters.sortDirection]);

  // Add extra logging to help diagnose match issues
  useEffect(() => {
    if (componentMatches) {
      console.log("Current match count:", componentMatches.length);
      if (componentMatches.length > 0) {
        console.log("Sample match:", componentMatches[0]);
      } else {
        console.log("No matches found - check matching logic");
      }
    }
  }, [componentMatches]);

  // Fetch user's swap requests
  const fetchUserRequests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log("Fetching user swap requests for user:", user.id);
      // Query the improved_shift_swaps table
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
  
  // Fetch requests when the component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchUserRequests();
      // Also fetch from the hook to ensure both data sources are up to date
      fetchRequests();
    }
  }, [user, fetchRequests]);

  // Refresh user requests when the "mySwaps" tab becomes active
  useEffect(() => {
    if (activeTab === "mySwaps" && user) {
      console.log("mySwaps tab activated, refreshing requests");
      fetchUserRequests();
      // Also refresh from the hook
      fetchRequests();
    } else if (activeTab === "matches" && user) {
      console.log("matches tab activated, refreshing matches");
      refreshMatches();
    }
  }, [activeTab, user, fetchRequests, refreshMatches]);
  
  // Handle creating a swap request
  const handleCreateSwap = async (shiftIds: string[], wantedDates: string[], acceptedTypes: string[], requiredSkillset?: string[]) => {
    setIsSubmitting(true);
    try {
      console.log("Creating swap request with: ", { shiftIds, wantedDates, acceptedTypes, requiredSkillset });
      
      const success = await createSwapRequest(shiftIds, wantedDates, acceptedTypes, requiredSkillset);
      
      if (success) {
        toast({
          title: "Success",
          description: "Swap request created successfully",
        });
        
        console.log("Swap created successfully, now fetching updated requests");
        
        // Reload the user's swap requests immediately after creation
        await Promise.all([
          fetchUserRequests(),
          fetchRequests()
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

  // Apply filters
  const handleApplyFilters = (newFilters: SwapFilters) => {
    setFilters(newFilters);
  };

  // Open filter dialog - update to handle different tabs
  const openFiltersDialog = (tab: 'create' | 'mySwaps') => {
    setFilteringTab(tab);
    setIsFiltersOpen(true);
  };

  // Handle delete request
  const handleDeleteRequest = async (requestId: string) => {
    // Open delete dialog for single request
    setDeleteDialog({
      isOpen: true,
      requestId,
      dayId: null,
      isDeleting: false
    });
  };

  // Handle delete preferred date
  const handleDeletePreferredDate = async (dayId: string, requestId: string) => {
    // Open delete dialog for a single preferred date
    setDeleteDialog({
      isOpen: true,
      requestId,
      dayId,
      isDeleting: false
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
      
      if (deleteDialog.dayId && deleteDialog.requestId) {
        // Delete a single preferred date
        console.log("Deleting preferred date:", deleteDialog.dayId, "from request:", deleteDialog.requestId);
        
        const result = await deletePreferredDay(deleteDialog.dayId, deleteDialog.requestId);
        
        if (!result.success) {
          throw new Error("Failed to delete preferred date");
        }
        
        // Need to check safely if requestDeleted exists to avoid TypeScript error
        const isRequestDeleted = 'requestDeleted' in result && result.requestDeleted === true;
        
        if (isRequestDeleted) {
          toast({
            title: "Success",
            description: "This was the last preferred date, so the entire request has been removed.",
          });
        } else {
          toast({
            title: "Success",
            description: "The selected date has been removed from your swap request.",
          });
        }
      } else if (deleteDialog.requestId) {
        // Delete an entire request
        console.log("Deleting swap request:", deleteDialog.requestId);
        
        const success = await deleteRequest(deleteDialog.requestId);
        
        if (!success) {
          throw new Error("Failed to delete swap request");
        }
        
        toast({
          title: "Success",
          description: "Swap request deleted successfully",
        });
      }
      
      // Refresh both data sources to ensure consistency
      await Promise.all([
        fetchUserRequests(),
        fetchRequests()
      ]);
      
    } catch (err: any) {
      console.error("Error during deletion:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to process deletion",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({
        isOpen: false,
        requestId: null,
        dayId: null,
        isDeleting: false
      });
    }
  };

  // Check if any filters are applied beyond default sort
  const hasActiveFilters = 
    filters.dateRange.from !== undefined || 
    filters.dateRange.to !== undefined || 
    filters.truckName !== null || 
    filters.shiftType !== null;

  // Month navigation component that can be reused
  const MonthNavigation = () => (
    <div className="flex items-center w-full">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={goToPreviousMonth}
        className="flex-shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous Month</span>
      </Button>
      <div className="flex-1 text-center">
        <h2 className="text-[0.85rem] font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={goToNextMonth}
        className="flex-shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next Month</span>
      </Button>
    </div>
  );
  
  // Filter button component that can be reused
  const FilterButton = ({ tab }: { tab: 'create' | 'mySwaps' }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openFiltersDialog(tab)}
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
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div></div>
        <div className="flex items-center space-x-2">
          <FilterButton tab={activeTab === 'create' ? 'create' : 'mySwaps'} />
          <RegionPreferencesButton />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Swap</TabsTrigger>
          <TabsTrigger value="mySwaps">My Swaps</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="mt-6 space-y-4">
          {/* Create Swap tab without filter button */}
          <div className="flex items-center justify-start mb-4">
            <MonthNavigation />
          </div>
          
          <div className="grid gap-6">
            <ImprovedSwapForm
              isOpen={true}
              onClose={() => {}}
              onSubmit={handleCreateSwap}
              isDialog={false}
              currentMonth={currentMonth}
              filters={filters}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="mySwaps" className="mt-6">
          {/* Month navigation without filter button */}
          <div className="flex items-center justify-start mb-4">
            <MonthNavigation />
          </div>
          
          {/* My Swaps Tab Content */}
          <div className="grid gap-4 md:grid-cols-2">
            {isLoading ? (
              // Loading skeleton
              Array(4).fill(0).map((_, i) => (
                <div key={`skeleton-${i}`} className="bg-muted/30 p-6 h-48 rounded-lg animate-pulse" />
              ))
            ) : groupedSwapRequests.length === 0 ? (
              // Empty state
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
            ) : (
              // Grouped swap requests
              groupedSwapRequests.map((group) => (
                <div key={`${group.shiftDate}-${group.shiftId}`}>
                  <SwapRequestCard 
                    groupedRequests={group.requests}
                    onDelete={handleDeleteRequest}
                    onDeletePreferredDate={handleDeletePreferredDate}
                    showCheckbox={false}
                  />
                </div>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="matches" className="mt-6">
          {/* Matches tab */}
          <MatchedSwapsTabs
            activeTab="active"
            setActiveTab={() => {}}
            matches={componentMatches}
            pastMatches={componentPastMatches}
            onAcceptSwap={(matchId) => console.log("Accept swap:", matchId)}
            onFinalizeSwap={(matchId) => console.log("Finalize swap:", matchId)}
            onCancelSwap={(matchId) => console.log("Cancel swap:", matchId)}
            onResendEmail={(matchId) => console.log("Resend email for swap:", matchId)}
            onRefresh={refreshMatches}
            isLoading={isMatchesLoading}
          />
        </TabsContent>
      </Tabs>
      
      {/* Delete dialog */}
      <SwapDeleteDialog
        isOpen={deleteDialog.isOpen}
        isLoading={deleteDialog.isDeleting}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteDialog({ isOpen: false, requestId: null, dayId: null, isDeleting: false });
          } else {
            setDeleteDialog(prev => ({ ...prev, isOpen: true }));
          }
        }}
        onDelete={handleConfirmDelete}
        isDateOnly={!!deleteDialog.dayId}
        isMultiDelete={false}
        selectionCount={0}
      />
      
      {/* Filter dialog */}
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
