import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from '@/hooks/use-toast';
import { ArrowRight, Check, Clock, Filter, Sunrise, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types
interface ShiftDetail {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  colleagueType?: string;
  colleague?: string;
}

interface MatchedSwap {
  id: string;
  originalShift: ShiftDetail;
  matchedShift: ShiftDetail;
  status: string;
}

const MatchedSwapsComponent = () => {
  const [swapRequests, setSwapRequests] = useState<MatchedSwap[]>([]);
  const [pastSwaps, setPastSwaps] = useState<MatchedSwap[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, swapId: string | null }>({
    isOpen: false,
    swapId: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMatchedSwaps = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Fetch active matched swaps
        const { data: activeMatches, error: activeError } = await supabase
          .from('shift_swap_requests')
          .select(`
            id,
            status,
            requester_id,
            requester_shift_id,
            acceptor_id,
            acceptor_shift_id
          `)
          .or(`requester_id.eq.${user.id},acceptor_id.eq.${user.id}`)
          .eq('status', 'matched');
          
        if (activeError) throw activeError;
        
        // Fetch completed swaps
        const { data: completedMatches, error: completedError } = await supabase
          .from('shift_swap_requests')
          .select(`
            id,
            status,
            requester_id,
            requester_shift_id,
            acceptor_id,
            acceptor_shift_id
          `)
          .or(`requester_id.eq.${user.id},acceptor_id.eq.${user.id}`)
          .eq('status', 'completed');
          
        if (completedError) throw completedError;
        
        // If no data, set empty arrays and return
        if ((!activeMatches || activeMatches.length === 0) && 
            (!completedMatches || completedMatches.length === 0)) {
          setSwapRequests([]);
          setPastSwaps([]);
          setIsLoading(false);
          return;
        }
        
        // Get all shift IDs to fetch in one query
        const allShiftIds = [
          ...(activeMatches || []).map(m => m.requester_shift_id),
          ...(activeMatches || []).map(m => m.acceptor_shift_id).filter(Boolean),
          ...(completedMatches || []).map(m => m.requester_shift_id),
          ...(completedMatches || []).map(m => m.acceptor_shift_id).filter(Boolean)
        ].filter(Boolean) as string[];
        
        if (allShiftIds.length === 0) {
          setSwapRequests([]);
          setPastSwaps([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch all shift details
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*, profiles(first_name, last_name)')
          .in('id', allShiftIds);
          
        if (shiftsError) throw shiftsError;
        
        // Process active matches
        const formattedActiveMatches = processSwapRequests(activeMatches || [], shiftsData || [], user.id);
        setSwapRequests(formattedActiveMatches);
        
        // Process completed matches
        const formattedCompletedMatches = processSwapRequests(completedMatches || [], shiftsData || [], user.id);
        setPastSwaps(formattedCompletedMatches);
      } catch (error) {
        console.error('Error fetching matched swaps:', error);
        toast({
          title: "Failed to load matched swaps",
          description: "There was a problem loading your matched swaps. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchedSwaps();
  }, [user]);

  // Helper function to process swap requests data
  const processSwapRequests = (
    requests: any[], 
    shifts: any[], 
    currentUserId: string
  ): MatchedSwap[] => {
    return requests
      .map(request => {
        // Find the shifts
        const requesterShift = shifts.find(s => s.id === request.requester_shift_id);
        const acceptorShift = shifts.find(s => s.id === request.acceptor_shift_id);
        
        if (!requesterShift || !acceptorShift) return null;
        
        // Determine which shift is "mine" vs "theirs" based on who's viewing
        const isRequester = request.requester_id === currentUserId;
        const myShift = isRequester ? requesterShift : acceptorShift;
        const theirShift = isRequester ? acceptorShift : requesterShift;
        
        // Format the shift details
        const formatShift = (shift: any, isOriginal: boolean): ShiftDetail => {
          // Determine shift type
          let type = 'day';
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour <= 8) {
            type = 'day';
          } else if (startHour > 8 && startHour < 16) {
            type = 'afternoon';
          } else {
            type = 'night';
          }
          
          // Get colleague name if available
          const hasProfile = shift.profiles && (shift.profiles.first_name || shift.profiles.last_name);
          const colleague = hasProfile 
            ? `${shift.profiles.first_name || ''} ${shift.profiles.last_name || ''}`.trim()
            : 'Unnamed Colleague';
            
          return {
            id: shift.id,
            date: shift.date,
            title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.start_time.substring(0, 5),
            endTime: shift.end_time.substring(0, 5),
            type,
            colleagueType: 'Unknown', // We don't have this info in the DB yet
            ...(isOriginal ? {} : { colleague })
          };
        };
        
        return {
          id: request.id,
          originalShift: formatShift(myShift, true),
          matchedShift: formatShift(theirShift, false),
          status: request.status
        };
      })
      .filter(Boolean) as MatchedSwap[];
  };

  // Accept swap
  const handleAcceptSwap = async () => {
    if (!confirmDialog.swapId || !user) return;
    
    setIsLoading(true);
    
    try {
      // Update the swap request status in the database
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status: 'completed' })
        .eq('id', confirmDialog.swapId);
        
      if (error) throw error;
      
      // Update the UI
      const completedSwap = swapRequests.find(s => s.id === confirmDialog.swapId);
      if (completedSwap) {
        // Move from active to completed
        setSwapRequests(prev => prev.filter(s => s.id !== confirmDialog.swapId));
        setPastSwaps(prev => [
          ...prev, 
          { ...completedSwap, status: 'completed' }
        ]);
      }
      
      toast({
        title: "Swap Accepted",
        description: "The shift swap has been successfully accepted.",
      });
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConfirmDialog({ isOpen: false, swapId: null });
      setIsLoading(false);
    }
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
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="active">Active Matches</TabsTrigger>
            <TabsTrigger value="past">Past Swaps</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" /> Filter
          </Button>
        </div>
        
        <TabsContent value="active">
          {swapRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-xl font-medium">No Matched Swaps</h3>
                <p className="text-muted-foreground mt-2">
                  You don't have any matched swap requests yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            swapRequests.map(swap => (
              <Card key={swap.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <div className={cn(
                      "p-1.5 rounded-md mr-2",
                      swap.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-600" :
                      swap.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-600" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      {getShiftIcon(swap.originalShift.type)}
                    </div>
                    <div>Swap Match Found</div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                      {/* Your Shift */}
                      <div className="flex-1 p-4 border rounded-lg bg-secondary/10">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Your Shift</div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "px-2 py-1 rounded text-xs font-medium flex items-center",
                            swap.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                            swap.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                            "bg-blue-100 text-blue-800"
                          )}>
                            {getShiftIcon(swap.originalShift.type)}
                            <span className="ml-1">{getShiftTypeLabel(swap.originalShift.type)}</span>
                          </div>
                          
                          <div className="text-sm font-medium">
                            {swap.originalShift.title}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Date</div>
                            <div>{formatDate(swap.originalShift.date)}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Time</div>
                            <div>{swap.originalShift.startTime} - {swap.originalShift.endTime}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Colleague</div>
                            <div>{swap.originalShift.colleagueType}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="hidden md:flex h-10 w-10 rounded-full bg-secondary items-center justify-center">
                          <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                        <div className="md:hidden h-10 w-10 rounded-full bg-secondary flex items-center justify-center transform rotate-90">
                          <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      
                      {/* Matched Shift */}
                      <div className="flex-1 p-4 border rounded-lg bg-green-50 border-green-200">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Matched Shift</div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "px-2 py-1 rounded text-xs font-medium flex items-center",
                            swap.matchedShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                            swap.matchedShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                            "bg-blue-100 text-blue-800"
                          )}>
                            {getShiftIcon(swap.matchedShift.type)}
                            <span className="ml-1">{getShiftTypeLabel(swap.matchedShift.type)}</span>
                          </div>
                          
                          <div className="text-sm font-medium">
                            {swap.matchedShift.title}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Date</div>
                            <div>{formatDate(swap.matchedShift.date)}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Time</div>
                            <div>{swap.matchedShift.startTime} - {swap.matchedShift.endTime}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Colleague</div>
                            <div>{swap.matchedShift.colleagueType}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Requested By</div>
                            <div>{swap.matchedShift.colleague}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center">
                        <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          Matched
                        </div>
                      </div>
                      
                      <Button onClick={() => setConfirmDialog({ isOpen: true, swapId: swap.id })}>
                        <Check className="h-4 w-4 mr-1" />
                        Accept Swap
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="past">
          {pastSwaps.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-xl font-medium">No Past Swaps</h3>
                <p className="text-muted-foreground mt-2">
                  You don't have any completed swaps yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            pastSwaps.map(swap => (
              <Card key={swap.id} className="opacity-80">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <div className={cn(
                      "p-1.5 rounded-md mr-2",
                      swap.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-600" :
                      swap.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-600" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      {getShiftIcon(swap.originalShift.type)}
                    </div>
                    <div>Completed Swap</div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                      {/* Original Shift */}
                      <div className="flex-1 p-4 border rounded-lg bg-secondary/10">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Original Shift</div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "px-2 py-1 rounded text-xs font-medium flex items-center",
                            swap.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                            swap.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                            "bg-blue-100 text-blue-800"
                          )}>
                            {getShiftIcon(swap.originalShift.type)}
                            <span className="ml-1">{getShiftTypeLabel(swap.originalShift.type)}</span>
                          </div>
                          
                          <div className="text-sm font-medium">
                            {swap.originalShift.title}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Date</div>
                            <div>{formatDate(swap.originalShift.date)}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Time</div>
                            <div>{swap.originalShift.startTime} - {swap.originalShift.endTime}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="hidden md:flex h-10 w-10 rounded-full bg-secondary items-center justify-center">
                          <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                        <div className="md:hidden h-10 w-10 rounded-full bg-secondary flex items-center justify-center transform rotate-90">
                          <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      
                      {/* Swapped Shift */}
                      <div className="flex-1 p-4 border rounded-lg bg-green-50/50 border-green-200">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Swapped Shift</div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "px-2 py-1 rounded text-xs font-medium flex items-center",
                            swap.matchedShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                            swap.matchedShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                            "bg-blue-100 text-blue-800"
                          )}>
                            {getShiftIcon(swap.matchedShift.type)}
                            <span className="ml-1">{getShiftTypeLabel(swap.matchedShift.type)}</span>
                          </div>
                          
                          <div className="text-sm font-medium">
                            {swap.matchedShift.title}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Date</div>
                            <div>{formatDate(swap.matchedShift.date)}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Time</div>
                            <div>{swap.matchedShift.startTime} - {swap.matchedShift.endTime}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Colleague</div>
                            <div>{swap.matchedShift.colleagueType}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center">
                        <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Completed
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        This swap will be removed on {formatDate('2025-05-30')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Accept Swap Confirmation Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmDialog({ isOpen: false, swapId: null });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Shift Swap</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this shift swap? This action will notify the other party and update your roster.
            </DialogDescription>
          </DialogHeader>
          
          {confirmDialog.swapId && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> If you have a shared calendar, you'll need to manually update your external calendar to reflect this swap.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, swapId: null })}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptSwap}
              disabled={isLoading}
            >
              {isLoading ? "Accepting..." : "Accept Swap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchedSwapsComponent;
