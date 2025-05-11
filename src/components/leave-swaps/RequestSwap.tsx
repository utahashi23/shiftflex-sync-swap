
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Trash, RefreshCw } from 'lucide-react';
import { useLeaveBlocks } from '@/hooks/leave-blocks/useLeaveBlocks';
import { useLeaveSwapRequests } from '@/hooks/leave-blocks/useLeaveSwapRequests';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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

const RequestSwap = () => {
  const [myLeaveBlockId, setMyLeaveBlockId] = useState<string>('');
  const [requestedLeaveBlockId, setRequestedLeaveBlockId] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  
  const {
    allLeaveBlocks,
    userLeaveBlocks,
    isLoadingLeaveBlocks,
    isLoadingUserLeaveBlocks,
    formatDate
  } = useLeaveBlocks();
  
  const {
    pendingRequests,
    matchedRequests,
    isLoadingRequests,
    requestsError,
    createRequest,
    isCreatingRequest,
    deleteRequest,
    isDeletingRequest,
    refetchRequests
  } = useLeaveSwapRequests();
  
  const handleCreateRequest = () => {
    if (!myLeaveBlockId || !requestedLeaveBlockId) return;
    
    createRequest({
      requesterLeaveBlockId: myLeaveBlockId,
      requestedLeaveBlockId: requestedLeaveBlockId,
    });
    
    setMyLeaveBlockId('');
    setRequestedLeaveBlockId('');
  };
  
  const handleDeleteRequest = (requestId: string) => {
    setRequestToDelete(requestId);
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteRequest = () => {
    if (requestToDelete) {
      deleteRequest({ requestId: requestToDelete });
    }
    setDeleteDialogOpen(false);
    setRequestToDelete(null);
  };
  
  // Filter out leave blocks that are already in pending or matched requests
  const availableMyLeaveBlocks = userLeaveBlocks?.filter(block => 
    !pendingRequests?.some(request => 
      request.requester_leave_block_id === block.leave_block_id
    ) && !matchedRequests?.some(request => 
      request.requester_leave_block_id === block.leave_block_id
    )
  );
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'matched':
        return <Badge variant="secondary">Matched</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <CardTitle>My Swap Requests</CardTitle>
              <CardDescription>
                View and manage your leave block swap requests
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchRequests()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requestsError ? (
            <Alert variant="destructive">
              <AlertTitle>Error loading requests</AlertTitle>
              <AlertDescription>
                {requestsError.message}
              </AlertDescription>
            </Alert>
          ) : isLoadingRequests ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : [...pendingRequests, ...matchedRequests].length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              You don't have any active swap requests. Create a new request below.
            </p>
          ) : (
            <Table>
              <TableCaption>Your leave swap requests</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>My Block</TableHead>
                  <TableHead>My Period</TableHead>
                  <TableHead>Requested Block</TableHead>
                  <TableHead>Requested Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...pendingRequests, ...matchedRequests].map(request => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.requester_leave_block?.block_number}
                    </TableCell>
                    <TableCell>
                      {formatDate(request.requester_leave_block?.start_date)} - {formatDate(request.requester_leave_block?.end_date)}
                    </TableCell>
                    <TableCell>{request.requested_leave_block?.block_number}</TableCell>
                    <TableCell>
                      {formatDate(request.requested_leave_block?.start_date)} - {formatDate(request.requested_leave_block?.end_date)}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteRequest(request.id)}
                        disabled={isDeletingRequest}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Swap Request</CardTitle>
          <CardDescription>
            Request to swap one of your leave blocks with another block
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Your Leave Block</label>
              {isLoadingUserLeaveBlocks ? (
                <Skeleton className="h-10 w-full" />
              ) : availableMyLeaveBlocks?.length === 0 ? (
                <Alert>
                  <AlertTitle>No leave blocks available</AlertTitle>
                  <AlertDescription>
                    Add leave blocks in the "My Leave" tab first, or all your blocks already have pending swap requests.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={myLeaveBlockId} onValueChange={setMyLeaveBlockId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your leave block" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMyLeaveBlocks?.map(block => (
                      <SelectItem key={block.id} value={block.leave_block_id}>
                        Block {block.block_number} ({formatDate(block.start_date)} - {formatDate(block.end_date)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Requested Leave Block</label>
              {isLoadingLeaveBlocks ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={requestedLeaveBlockId} onValueChange={setRequestedLeaveBlockId} disabled={!myLeaveBlockId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select desired leave block" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLeaveBlocks?.filter(block => 
                      !userLeaveBlocks?.some(userBlock => userBlock.leave_block_id === block.id)
                    ).map(block => (
                      <SelectItem key={block.id} value={block.id}>
                        Block {block.block_number} ({formatDate(block.start_date)} - {formatDate(block.end_date)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={handleCreateRequest}
                disabled={!myLeaveBlockId || !requestedLeaveBlockId || isCreatingRequest}
                className="w-full"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Create Swap Request
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Swap Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this swap request? 
              {matchedRequests?.some(request => request.id === requestToDelete) && 
                " This will also cancel any associated match."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteRequest}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RequestSwap;
