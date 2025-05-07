
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar, Clock, Copy, UserCircle2, Info, Badge, User } from "lucide-react";
import { useState, useEffect } from "react";
import { SwapMatch } from "./types";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { toast } from "@/hooks/use-toast";
import { fetchSwapRequestDetailsSafe } from "@/utils/rls-helpers";

interface ShiftDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swap: SwapMatch | null;
}

interface RequestDetails {
  id: string;
  requester_id: string;
  requester_name: string;
  created_at: string;
  status: string;
  employee_id?: string | null;
}

export function ShiftDetailsDialog({ 
  open, 
  onOpenChange, 
  swap 
}: ShiftDetailsDialogProps) {
  const [copied, setCopied] = useState(false);
  const [myRequestDetails, setMyRequestDetails] = useState<RequestDetails | null>(null);
  const [otherRequestDetails, setOtherRequestDetails] = useState<RequestDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    async function fetchRequestDetails() {
      if (!swap) return;
      
      setIsLoading(true);
      
      try {
        // Fetch both requests using our safe helper function
        const [myRequestResult, otherRequestResult] = await Promise.all([
          fetchSwapRequestDetailsSafe(swap.myRequestId),
          fetchSwapRequestDetailsSafe(swap.otherRequestId)
        ]);
        
        // Process my request results
        if (myRequestResult.error) {
          console.error('Error fetching my request details:', myRequestResult.error);
          toast({
            title: "Error loading details",
            description: "Could not load your request details. Please try again.",
            variant: "destructive"
          });
        } else if (myRequestResult.data) {
          const data = myRequestResult.data;
          const requesterName = data.requester_first_name && data.requester_last_name 
            ? `${data.requester_first_name} ${data.requester_last_name}`.trim()
            : 'Unknown User';
            
          setMyRequestDetails({
            id: data.id,
            requester_id: data.requester_id,
            requester_name: requesterName,
            created_at: new Date(data.created_at).toLocaleString(),
            status: data.status,
            employee_id: data.requester_employee_id
          });
        }
        
        // Process other request results
        if (otherRequestResult.error) {
          console.error('Error fetching other request details:', otherRequestResult.error);
        } else if (otherRequestResult.data) {
          const data = otherRequestResult.data;
          const requesterName = data.requester_first_name && data.requester_last_name 
            ? `${data.requester_first_name} ${data.requester_last_name}`.trim()
            : 'Unknown User';
            
          setOtherRequestDetails({
            id: data.id,
            requester_id: data.requester_id,
            requester_name: requesterName,
            created_at: new Date(data.created_at).toLocaleString(),
            status: data.status,
            employee_id: data.requester_employee_id
          });
        }
        
      } catch (error) {
        console.error('Error in fetchRequestDetails:', error);
        toast({
          title: "Error loading details",
          description: "An unexpected error occurred while loading request details.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    if (open && swap) {
      fetchRequestDetails();
    }
  }, [swap, open]);
  
  if (!swap) return null;
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  };
  
  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { text: 'Pending', colorClass: 'bg-amber-100 text-amber-800' };
      case 'accepted':
        return { text: 'Accepted', colorClass: 'bg-blue-100 text-blue-800' };
      case 'other_accepted':
        return { text: 'Accepted by Another', colorClass: 'bg-gray-100 text-gray-800' };
      case 'completed':
        return { text: 'Completed', colorClass: 'bg-green-100 text-green-800' };
      default:
        return { text: status.charAt(0).toUpperCase() + status.slice(1), colorClass: 'bg-gray-100 text-gray-800' };
    }
  };

  const statusDisplay = getStatusDisplay(swap.status);
  
  const copyDetails = () => {
    const details = `
Swap Details (ID: ${swap.id})
Status: ${statusDisplay.text}

YOUR SHIFT:
Date: ${formatDate(swap.myShift.date)}
Time: ${swap.myShift.startTime} - ${swap.myShift.endTime}
${swap.myShift.colleagueType ? `Colleague Type: ${swap.myShift.colleagueType}` : ''}
${swap.myShift.employeeId ? `Service#: ${swap.myShift.employeeId}` : ''}
${swap.myShift.truckName ? `Location: ${swap.myShift.truckName}` : ''}

THEIR SHIFT:
Person: ${otherRequestDetails?.requester_name || swap.otherShift.userName || 'Unknown User'}
Date: ${formatDate(swap.otherShift.date)}
Time: ${swap.otherShift.startTime} - ${swap.otherShift.endTime}
${swap.otherShift.colleagueType ? `Colleague Type: ${swap.otherShift.colleagueType}` : ''}
${otherRequestDetails?.employee_id ? `Service#: ${otherRequestDetails.employee_id}` : 
  (swap.otherShift.employeeId ? `Service#: ${swap.otherShift.employeeId}` : '')}
${swap.otherShift.truckName ? `Location: ${swap.otherShift.truckName}` : ''}
    `.trim();
    
    navigator.clipboard.writeText(details)
      .then(() => {
        setCopied(true);
        toast({
          title: "Details copied to clipboard",
          description: "The swap details have been copied to your clipboard.",
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy details:', err);
        toast({
          title: "Failed to copy details",
          description: "There was an issue copying the details to clipboard.",
          variant: "destructive"
        });
      });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Swap Details</span>
          </DialogTitle>
          <DialogDescription>
            View information about this swap match
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          {/* Request Information */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Status</h3>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusDisplay.colorClass}`}>
              {statusDisplay.text}
            </span>
          </div>
          
          {/* Your Shift */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium border-b pb-2">Your Shift</h3>
            
            <div className="grid grid-cols-2 gap-y-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{formatDate(swap.myShift.date)}</span>
              </div>
              
              <div className="flex items-center">
                <ShiftTypeBadge type={swap.myShift.type} />
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{swap.myShift.startTime} - {swap.myShift.endTime}</span>
              </div>
              
              {swap.myShift.colleagueType && (
                <div className="flex items-center">
                  <UserCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{swap.myShift.colleagueType}</span>
                </div>
              )}
              
              {myRequestDetails?.requester_name && (
                <div className="flex items-center col-span-2">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm"><strong>Requester:</strong> {myRequestDetails.requester_name}</span>
                </div>
              )}
              
              {(myRequestDetails?.employee_id || swap.myShift.employeeId) && (
                <div className="flex items-center col-span-2">
                  <Badge className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm"><strong>Service#:</strong> {myRequestDetails?.employee_id || swap.myShift.employeeId}</span>
                </div>
              )}
              
              {swap.myShift.truckName && (
                <div className="flex items-center col-span-2">
                  <span className="text-sm"><strong>Location:</strong> {swap.myShift.truckName}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Their Shift */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium border-b pb-2">Their Shift</h3>
            
            <div className="grid grid-cols-2 gap-y-3">
              <div className="flex items-center col-span-2 text-sm font-medium text-primary">
                {otherRequestDetails?.requester_name || swap.otherShift.userName || 'Unknown User'}
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{formatDate(swap.otherShift.date)}</span>
              </div>
              
              <div className="flex items-center">
                <ShiftTypeBadge type={swap.otherShift.type} />
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{swap.otherShift.startTime} - {swap.otherShift.endTime}</span>
              </div>
              
              {swap.otherShift.colleagueType && (
                <div className="flex items-center">
                  <UserCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{swap.otherShift.colleagueType}</span>
                </div>
              )}
              
              {(otherRequestDetails?.employee_id || swap.otherShift.employeeId) && (
                <div className="flex items-center col-span-2">
                  <Badge className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm"><strong>Service#:</strong> {otherRequestDetails?.employee_id || swap.otherShift.employeeId}</span>
                </div>
              )}
              
              {swap.otherShift.truckName && (
                <div className="flex items-center col-span-2">
                  <span className="text-sm"><strong>Location:</strong> {swap.otherShift.truckName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          
          <Button 
            onClick={copyDetails}
            className="flex items-center"
            variant="secondary"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copied ? 'Copied' : 'Copy Details'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
