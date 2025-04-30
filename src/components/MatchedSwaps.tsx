
import { useState } from 'react';
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

// Mock data
const mockMatchedSwaps = [
  {
    id: 1,
    originalShift: {
      id: 101,
      date: '2025-05-03',
      title: '04-MAT03',
      startTime: '15:00',
      endTime: '23:00',
      type: 'afternoon',
      colleagueType: 'Qualified'
    },
    matchedShift: {
      id: 201,
      date: '2025-05-06',
      title: '06-MAT07',
      startTime: '15:00',
      endTime: '23:00',
      type: 'afternoon',
      colleagueType: 'Graduate',
      colleague: 'Sarah Johnson'
    },
    status: 'matched'
  },
  {
    id: 2,
    originalShift: {
      id: 102,
      date: '2025-05-10',
      title: '08-MAT11',
      startTime: '23:00',
      endTime: '07:00',
      type: 'night',
      colleagueType: 'ACO'
    },
    matchedShift: {
      id: 202,
      date: '2025-05-14',
      title: '09-MAT12',
      startTime: '23:00',
      endTime: '07:00',
      type: 'night',
      colleagueType: 'ACO',
      colleague: 'Michael Chen'
    },
    status: 'matched'
  }
];

const mockPastSwaps = [
  {
    id: 3,
    originalShift: {
      id: 103,
      date: '2025-04-18',
      title: '02-MAT01',
      startTime: '07:00',
      endTime: '15:00',
      type: 'day',
      colleagueType: 'Qualified'
    },
    matchedShift: {
      id: 203,
      date: '2025-04-21',
      title: '04-MAT03',
      startTime: '07:00',
      endTime: '15:00',
      type: 'day',
      colleagueType: 'Qualified',
      colleague: 'Alex Wong'
    },
    status: 'completed'
  },
  {
    id: 4,
    originalShift: {
      id: 104,
      date: '2025-04-25',
      title: '06-MAT07',
      startTime: '15:00',
      endTime: '23:00',
      type: 'afternoon',
      colleagueType: 'Graduate'
    },
    matchedShift: {
      id: 204,
      date: '2025-04-28',
      title: '08-MAT11',
      startTime: '15:00',
      endTime: '23:00',
      type: 'afternoon',
      colleagueType: 'Qualified',
      colleague: 'Jamie Rodriguez'
    },
    status: 'completed'
  }
];

const MatchedSwaps = () => {
  const [swapRequests, setSwapRequests] = useState(mockMatchedSwaps);
  const [pastSwaps, setPastSwaps] = useState(mockPastSwaps);
  const [activeTab, setActiveTab] = useState('active');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, swapId: number | null }>({
    isOpen: false,
    swapId: null
  });
  const [isLoading, setIsLoading] = useState(false);

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

  // Accept swap
  const handleAcceptSwap = () => {
    if (!confirmDialog.swapId) return;
    
    setIsLoading(true);
    
    // In a real app, this would make an API call
    setTimeout(() => {
      setSwapRequests(prev => 
        prev.map(swap => 
          swap.id === confirmDialog.swapId ? { ...swap, status: 'completed' } : swap
        )
      );
      
      toast({
        title: "Swap Accepted",
        description: "The shift swap has been successfully accepted.",
      });
      
      setTimeout(() => {
        // In a real app, we would move completed swaps to the past swaps list
        setSwapRequests(prev => prev.filter(swap => swap.id !== confirmDialog.swapId));
        setPastSwaps(prev => [
          ...prev, 
          {...swapRequests.find(swap => swap.id === confirmDialog.swapId)!, status: 'completed'}
        ]);
      }, 500);
      
      setConfirmDialog({ isOpen: false, swapId: null });
      setIsLoading(false);
    }, 1000);
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

export default MatchedSwaps;
