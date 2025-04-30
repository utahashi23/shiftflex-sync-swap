
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Calendar, CalendarClock, Clock, Loader2, Truck, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/hooks/auth/supabase-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
interface SwapRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  requestDate: string;
  requesterShift: {
    id: string;
    date: string;
    title: string;
    startTime: string;
    endTime: string;
    type: 'day' | 'afternoon' | 'night';
  };
  acceptableShifts: {
    types: string[];
    dates: string[];
  };
}

const RequestedSwaps = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mock data for demonstration
  const mockSwaps: SwapRequest[] = [
    {
      id: '1',
      status: 'pending',
      requestDate: '2025-04-29',
      requesterShift: {
        id: '101',
        date: '2025-05-15',
        title: '02-MAT01',
        startTime: '07:00',
        endTime: '15:00',
        type: 'day',
      },
      acceptableShifts: {
        types: ['day', 'afternoon'],
        dates: ['2025-05-18', '2025-05-20', '2025-05-22'],
      },
    },
    {
      id: '2',
      status: 'pending',
      requestDate: '2025-04-28',
      requesterShift: {
        id: '102',
        date: '2025-05-20',
        title: '06-MAT07',
        startTime: '23:00',
        endTime: '07:00',
        type: 'night',
      },
      acceptableShifts: {
        types: ['night'],
        dates: ['2025-05-21', '2025-05-22', '2025-05-23', '2025-05-24'],
      },
    },
  ];

  // Fetch swap requests
  const { data: swapRequests, isLoading } = useQuery({
    queryKey: ['swap-requests'],
    queryFn: async () => {
      // In a real app, we'd fetch from Supabase
      // const { data, error } = await supabase
      //   .from('shift_swap_requests')
      //   .select('*')
      //   .eq('requester_id', user?.id);
      
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockSwaps;
    },
    enabled: !!user,
  });
  
  // Cancel swap request mutation
  const cancelSwapMutation = useMutation({
    mutationFn: async (swapId: string) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      return swapId;
    },
    onSuccess: (swapId) => {
      toast({
        title: "Swap Request Cancelled",
        description: "Your swap request has been successfully cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['swap-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: "There was a problem cancelling your request.",
        variant: "destructive",
      });
    }
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  const getStatusBadgeColor = (status: SwapRequest['status']) => {
    switch (status) {
      case 'pending': return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case 'accepted': return "bg-green-100 text-green-800 hover:bg-green-100";
      case 'rejected': return "bg-red-100 text-red-800 hover:bg-red-100";
      case 'cancelled': return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default: return "";
    }
  };

  const handleCancelSwap = (swapId: string) => {
    cancelSwapMutation.mutate(swapId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Loading your swap requests...</p>
        </div>
      </div>
    );
  }

  if (!swapRequests || swapRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-muted/30 p-6 rounded-full mb-4">
          <ArrowRightLeft className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Swap Requests</h3>
        <p className="text-muted-foreground mb-6">
          You haven't requested any shift swaps yet.
        </p>
        <Button onClick={() => window.location.href = '/shifts'}>
          <Calendar className="h-4 w-4 mr-2" />
          Go to Calendar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {swapRequests.map((swap) => (
        <Card key={swap.id} className="overflow-hidden">
          <div className="bg-muted/20 px-6 py-4 flex justify-between items-center border-b">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className={getStatusBadgeColor(swap.status)}>
                {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
              </Badge>
              <div className="text-sm text-muted-foreground">
                Requested on {formatDate(swap.requestDate)}
              </div>
            </div>
            {swap.status === 'pending' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleCancelSwap(swap.id)}
                disabled={cancelSwapMutation.isPending}
              >
                {cancelSwapMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Cancel
              </Button>
            )}
          </div>
          
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Original Shift */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Shift:</h4>
                <div className="bg-primary/5 rounded-md p-4 border border-primary/10">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium">{formatDate(swap.requesterShift.date)}</div>
                      <div className="text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 inline mr-1" />
                        {swap.requesterShift.startTime} - {swap.requesterShift.endTime}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-medium">
                      <Truck className="h-3 w-3 mr-1" />
                      {swap.requesterShift.title}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <Badge variant={swap.requesterShift.type === 'day' ? 'yellow' : 
                           swap.requesterShift.type === 'afternoon' ? 'orange' : 'blue'}>
                      {swap.requesterShift.type.charAt(0).toUpperCase() + swap.requesterShift.type.slice(1)} Shift
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Requested Swap Options */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Will Accept:</h4>
                <div className="bg-muted/20 rounded-md p-4 border border-muted">
                  <div className="mb-3">
                    <div className="text-sm font-medium">Acceptable Shift Types:</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {swap.acceptableShifts.types.map(type => (
                        <Badge key={type} variant="outline">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">Acceptable Dates:</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {swap.acceptableShifts.dates.map(date => (
                        <Badge key={date} variant="outline" className="flex items-center">
                          <CalendarClock className="h-3 w-3 mr-1" />
                          {formatDate(date)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RequestedSwaps;
