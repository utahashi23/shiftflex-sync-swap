import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Calendar, Sun, Sunrise, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types for swap requests
interface ShiftDetails {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
}

interface PreferredDate {
  date: string;
  acceptedTypes: string[];
}

interface SwapRequest {
  id: string;
  originalShift: ShiftDetails;
  preferredDates: PreferredDate[];
  status: string;
}

const RequestedSwaps = () => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, requestId: string | null, dateOnly: string | null }>({
    isOpen: false,
    requestId: null,
    dateOnly: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch swap requests from the database
  useEffect(() => {
    const fetchSwapRequests = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Fetch swap requests where the user is the requester
        const { data: swapRequestsData, error: swapError } = await supabase
          .from('shift_swap_requests')
          .select(`
            id,
            status,
            requester_shift_id,
            created_at
          `)
          .eq('requester_id', user.id)
          .eq('status', 'pending');
          
        if (swapError) throw swapError;
        
        if (!swapRequestsData || swapRequestsData.length === 0) {
          setSwapRequests([]);
          setIsLoading(false);
          return;
        }
        
        // Get all the shift IDs to fetch their details
        const shiftIds = swapRequestsData.map(req => req.requester_shift_id);
        
        // Fetch details for all the original shifts
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .in('id', shiftIds);
          
        if (shiftsError) throw shiftsError;
        
        // Map the data to our UI format
        const formattedRequests: SwapRequest[] = swapRequestsData.map(request => {
          // Find the corresponding shift
          const shift = shiftsData?.find(s => s.id === request.requester_shift_id);
          
          if (!shift) {
            console.error(`Shift not found for request ${request.id}`);
            return null;
          }
          
          // Determine shift type based on start time
          let type = 'day';
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour <= 8) {
            type = 'day';
          } else if (startHour > 8 && startHour < 16) {
            type = 'afternoon';
          } else {
            type = 'night';
          }
          
          // For now, we'll use the same date as the preferred date
          // In a real app with a separate table for preferred dates, we would fetch those
          const preferredDates = [
            { 
              date: new Date(shift.date).toISOString().split('T')[0], 
              acceptedTypes: [type] 
            }
          ];
          
          return {
            id: request.id,
            originalShift: {
              id: shift.id,
              date: shift.date,
              title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
              startTime: shift.start_time.substring(0, 5),
              endTime: shift.end_time.substring(0, 5),
              type
            },
            preferredDates,
            status: request.status
          };
        }).filter(Boolean) as SwapRequest[];
        
        setSwapRequests(formattedRequests);
      } catch (error) {
        console.error('Error fetching swap requests:', error);
        toast({
          title: "Failed to load swap requests",
          description: "There was a problem loading your swap requests. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSwapRequests();
  }, [user]);

  // Delete an entire swap request
  const handleDeleteSwapRequest = async () => {
    if (!deleteDialog.requestId) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('shift_swap_requests')
        .delete()
        .eq('id', deleteDialog.requestId);
        
      if (error) throw error;
      
      setSwapRequests(prev => prev.filter(req => req.id !== deleteDialog.requestId));
      
      toast({
        title: "Swap Request Deleted",
        description: "Your swap request has been deleted.",
      });
    } catch (error) {
      console.error('Error deleting swap request:', error);
      toast({
        title: "Error",
        description: "Failed to delete the swap request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialog({ isOpen: false, requestId: null, dateOnly: null });
      setIsLoading(false);
    }
  };

  // Delete a single preferred date from a swap request
  const handleDeletePreferredDate = async () => {
    // This functionality would require a separate table for preferred dates
    // For now, we'll just handle the UI aspect
    if (!deleteDialog.requestId || !deleteDialog.dateOnly) return;
    
    setIsLoading(true);
    
    // In a real app, this would make an API call to update the preferred dates
    setTimeout(() => {
      setSwapRequests(prev => 
        prev.map(req => {
          if (req.id === deleteDialog.requestId) {
            const updatedPreferredDates = req.preferredDates.filter(
              date => date.date !== deleteDialog.dateOnly
            );
            
            // If no preferred dates left, remove the whole request
            if (updatedPreferredDates.length === 0) {
              return null;
            }
            
            return {
              ...req,
              preferredDates: updatedPreferredDates
            };
          }
          return req;
        }).filter(Boolean) as SwapRequest[]
      );
      
      toast({
        title: "Preferred Date Removed",
        description: "The selected date has been removed from your swap request.",
      });
      
      setDeleteDialog({ isOpen: false, requestId: null, dateOnly: null });
      setIsLoading(false);
    }, 500);
  };

  // Get shift icon based on type
  const getShiftIcon = (type: string) => {
    switch(type) {
      case 'day':
        return <Sunrise className="h-4 w-4" />;
      case 'afternoon':
        return <Sun className="h-4 w-4" />;
      case 'night':
        return <Moon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Format date to user-friendly string
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get shift type label
  const getShiftTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="bg-gray-100 h-16"></CardHeader>
              <CardContent className="py-8">
                <div className="space-y-4">
                  <div className="h-12 bg-gray-100 rounded"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <div className="h-20 bg-gray-100 rounded"></div>
                    <div className="h-20 bg-gray-100 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : swapRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-xl font-medium">No Swap Requests</h3>
            <p className="text-muted-foreground mt-2">
              You haven't requested any shift swaps yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        swapRequests.map(request => (
          <Card key={request.id} className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-8 w-8 text-gray-500 hover:text-red-600"
              onClick={() => setDeleteDialog({
                isOpen: true,
                requestId: request.id,
                dateOnly: null
              })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <CardHeader>
              <CardTitle className="text-lg">
                <div className="flex items-center">
                  <div className={cn(
                    "p-1.5 rounded-md mr-2",
                    request.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-600" :
                    request.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {getShiftIcon(request.originalShift.type)}
                  </div>
                  <div>
                    {request.originalShift.title} ({formatDate(request.originalShift.date)})
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Original Shift</div>
                    <div className="font-medium">
                      {formatDate(request.originalShift.date)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Shift Type</div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium inline-flex items-center",
                      request.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                      request.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                      "bg-blue-100 text-blue-800"
                    )}>
                      {getShiftIcon(request.originalShift.type)}
                      <span className="ml-1">{getShiftTypeLabel(request.originalShift.type)} Shift</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Time</div>
                    <div className="font-medium">{request.originalShift.startTime} - {request.originalShift.endTime}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Preferred Swap Dates</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {request.preferredDates.map((preferredDate, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 border rounded-md bg-secondary/20"
                      >
                        <div>
                          <div className="font-medium">{formatDate(preferredDate.date)}</div>
                          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-1">
                            {preferredDate.acceptedTypes.map(type => (
                              <span
                                key={type}
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-xs",
                                  type === 'day' ? "bg-yellow-100 text-yellow-800" :
                                  type === 'afternoon' ? "bg-orange-100 text-orange-800" :
                                  "bg-blue-100 text-blue-800"
                                )}
                              >
                                {getShiftTypeLabel(type)}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {request.preferredDates.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                            onClick={() => setDeleteDialog({
                              isOpen: true,
                              requestId: request.id,
                              dateOnly: preferredDate.date
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-secondary/20 border-t px-6">
              <div className="flex justify-between items-center w-full py-2">
                <div className="text-sm">Status:</div>
                <div className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                  Pending
                </div>
              </div>
            </CardFooter>
          </Card>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteDialog({ isOpen: false, requestId: null, dateOnly: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.dateOnly ? "Remove Preferred Date?" : "Delete Swap Request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.dateOnly
                ? "Are you sure you want to remove this preferred date from your swap request?"
                : "Are you sure you want to delete this entire swap request?"
              }
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={deleteDialog.dateOnly ? handleDeletePreferredDate : handleDeleteSwapRequest}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RequestedSwaps;
