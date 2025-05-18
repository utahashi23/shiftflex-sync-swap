
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useLeaveBlocks } from '@/hooks/leave-blocks';
import { useLeaveSwapRequests } from '@/hooks/leave-blocks';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const RequestSwap = () => {
  const { leaveBlocks, isLoading: loadingBlocks } = useLeaveBlocks();
  const { requests, isLoading: loadingRequests, refreshRequests, cancelRequest } = useLeaveSwapRequests();
  const [selectedBlockId, setSelectedBlockId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleCreateRequest = async () => {
    if (!selectedBlockId) {
      toast({
        title: "Select a block",
        description: "Please select a leave block to swap",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Here you would call your API to create a swap request
      toast({
        title: "Request Created",
        description: "Your leave swap request has been created"
      });
      setSelectedBlockId("");
      refreshRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create leave swap request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Leave Swap</CardTitle>
          <CardDescription>
            Select a leave block you would like to swap
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBlocks ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Block to Swap
                </label>
                <Select
                  value={selectedBlockId}
                  onValueChange={setSelectedBlockId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a leave block" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveBlocks.map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        Block {block.block_number}{block.split_designation ? ` (${block.split_designation})` : ''}: {format(new Date(block.start_date), 'MMM d')} - {format(new Date(block.end_date), 'MMM d, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleCreateRequest}
                  disabled={!selectedBlockId || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Swap Request"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Swap Requests</CardTitle>
            <CardDescription>
              Manage your existing leave swap requests
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshRequests()}
            disabled={loadingRequests}
          >
            <RefreshCw className={`h-4 w-4 ${loadingRequests ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No active swap requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium">
                      Block {request.requester_leave_block?.block_number}
                      {request.requester_leave_block?.split_designation && 
                        <span className="ml-1">({request.requester_leave_block.split_designation})</span>}
                    </p>
                    <p className="text-sm text-gray-500">
                      {request.requester_leave_block && format(new Date(request.requester_leave_block.start_date), 'MMM d')} - 
                      {request.requester_leave_block && format(new Date(request.requester_leave_block.end_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Created {format(new Date(request.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => cancelRequest(request.id)}
                  >
                    Cancel request
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestSwap;
