
import { useState, useEffect, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import SwapRequestCard from './swaps/SwapRequestCard';
import SwapRequestSkeleton from './swaps/SwapRequestSkeleton';
import EmptySwapRequests from './swaps/EmptySwapRequests';
import SwapDeleteDialog from './swaps/SwapDeleteDialog';
import { useSwapRequests } from '@/hooks/swap-requests';
import { toast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { ChevronLeft, ChevronRight, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SwapRequest } from '@/hooks/swap-requests/types';

// Interface for grouped swap requests
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

const RequestedSwaps = () => {
  const { 
    requests, 
    isLoading,
    fetchRequests: fetchSwapRequests, 
    deleteRequest: deleteSwapRequest, 
    deletePreferredDate: deletePreferredDay 
  } = useSwapRequests();
  
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

  // State for month-based navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // State for selected requests (for multiple deletion)
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  
  // State for sort direction
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Fetch swap requests when component mounts
  useEffect(() => {
    console.log("RequestedSwaps - Fetching swap requests on mount");
    fetchSwapRequests();
  }, [fetchSwapRequests]);
  
  // Helper function to determine shift type based on start time
  function getShiftType(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0], 10);
    if (hour <= 8) return 'day';
    if (hour > 8 && hour < 16) return 'afternoon';
    return 'night';
  }
  
  // Group swap requests by shift date
  const groupedSwapRequests = useMemo(() => {
    if (!requests || requests.length === 0) {
      return [];
    }
    
    console.log("Grouping swap requests:", requests);
    
    // Extract requests that have shifts property
    const requestsWithShifts = requests.filter(request => request.shifts?.date) as Array<SwapRequest & { shifts: any }>;
    
    // First filter and sort the requests based on current filters
    const filteredRequests = requestsWithShifts
      .filter(request => {
        // Check if the request has shift data
        if (!request.shifts?.date) {
          console.warn("Request missing shift data:", request);
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
        
        return sortDirection === 'asc' 
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
  }, [requests, currentMonth, sortDirection]);
  
  // Helper function to determine shift type based on start time
  function getShiftType(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0], 10);
    if (hour <= 8) return 'day';
    if (hour > 8 && hour < 16) return 'afternoon';
    return 'night';
  }
  
  // Handler for opening delete dialog for an entire swap request
  const onDeleteRequest = (requestId: string) => {
    console.log("Opening delete dialog for request:", requestId);
    setDeleteDialog({
      isOpen: true,
      requestId,
      dayId: null,
      isDeleting: false
    });
  };

  // Handler for opening delete dialog for multiple swap requests
  const onDeleteMultipleRequests = () => {
    if (selectedRequests.length === 0) return;
    
    setDeleteDialog({
      isOpen: true,
      requestId: null,
      dayId: null,
      isDeleting: false
    });
  };

  // Handler for opening delete dialog for a single preferred date
  const onDeletePreferredDate = (dayId: string, requestId: string) => {
    console.log("Opening delete dialog for day:", dayId, "in request:", requestId);
    setDeleteDialog({
      isOpen: true,
      requestId,
      dayId,
      isDeleting: false
    });
  };

  // Handler for confirming deletion
  const handleConfirmDelete = async () => {
    try {
      setDeleteDialog(prev => ({ ...prev, isDeleting: true }));
      
      if (selectedRequests.length > 0 && !deleteDialog.requestId) {
        // Delete multiple selected requests
        for (const requestId of selectedRequests) {
          await deleteSwapRequest(requestId);
        }
        setSelectedRequests([]);
      } else if (deleteDialog.requestId) {
        if (deleteDialog.dayId) {
          // Delete a single preferred date
          const result = await deletePreferredDay(deleteDialog.dayId, deleteDialog.requestId);
          console.log("Delete preferred day result:", result);
          
          // Type-safe check if this was the last date and the entire request was deleted
          if (result && 'requestDeleted' in result && result.requestDeleted) {
            // Refresh the list
            await fetchSwapRequests();
          }
        } else {
          // Delete the entire swap request
          await deleteSwapRequest(deleteDialog.requestId);
          // Refresh the list explicitly to ensure UI is updated
          await fetchSwapRequests();
        }
      }
      
      setDeleteDialog({ isOpen: false, requestId: null, dayId: null, isDeleting: false });
    } catch (error) {
      console.error("Error in deletion process:", error);
      toast({
        title: "Deletion Failed",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive"
      });
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
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

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  // Check if any requests are selected
  const hasSelectedRequests = selectedRequests.length > 0;
  
  return (
    
    <div className="space-y-6">
      {/* Month navigation and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous Month</span>
          </Button>
          <h2 className="text-lg font-medium">
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
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortDirection}
            className="flex items-center space-x-1"
          >
            <span>Date</span>
            {sortDirection === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteMultipleRequests}
            disabled={!hasSelectedRequests}
            className={cn(
              "flex items-center space-x-1",
              hasSelectedRequests ? "bg-red-50 hover:bg-red-100 text-red-700" : ""
            )}
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete Selected</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <SwapRequestSkeleton key={index} />
          ))}
        </div>
      ) : groupedSwapRequests.length === 0 ? (
        <EmptySwapRequests />
      ) : (
        <div className="space-y-4">
          {groupedSwapRequests.map((group) => (
            <div key={group.shiftDate} className="flex items-start space-x-2">
              <Checkbox 
                id={`select-group-${group.shiftDate}`}
                checked={group.requests.every(req => selectedRequests.includes(req.id))}
                onCheckedChange={() => {
                  // If all requests in the group are selected, unselect them all
                  // Otherwise, select all requests in the group
                  const allSelected = group.requests.every(req => selectedRequests.includes(req.id));
                  if (allSelected) {
                    setSelectedRequests(prev => prev.filter(id => !group.requests.some(req => req.id === id)));
                  } else {
                    const requestIds = group.requests.map(req => req.id);
                    setSelectedRequests(prev => [...new Set([...prev, ...requestIds])]);
                  }
                }}
                className="mt-2"
              />
              <div className="flex-1">
                <SwapRequestCard 
                  groupedRequests={group.requests}
                  onDelete={onDeleteRequest}
                  onDeletePreferredDate={onDeletePreferredDate}
                  showCheckbox={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}

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
        isMultiDelete={selectedRequests.length > 0 && !deleteDialog.requestId}
        selectionCount={selectedRequests.length}
      />
    </div>
  );
};

export default RequestedSwaps;
