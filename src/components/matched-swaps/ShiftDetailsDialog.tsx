import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar, Clock, Copy, UserCircle2, Info, Badge, User, Clock8 } from "lucide-react";
import { useState, useEffect } from "react";
import { SwapMatch } from "./types";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
}

export function ShiftDetailsDialog({ 
  open, 
  onOpenChange, 
  swap 
}: ShiftDetailsDialogProps) {
  const [copied, setCopied] = useState(false);
  const [requesterInfo, setRequesterInfo] = useState<{ id: string, userName: string } | null>(null);
  const [myRequestDetails, setMyRequestDetails] = useState<RequestDetails | null>(null);
  const [otherRequestDetails, setOtherRequestDetails] = useState<RequestDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    async function fetchRequestDetails() {
      if (!swap) return;
      
      setIsLoading(true);
      
      try {
        // Fetch both requests in parallel for efficiency
        const [myRequestResult, otherRequestResult] = await Promise.all([
          supabase
            .from('shift_swap_requests')
            .select(`
              id,
              requester_id,
              status,
              created_at,
              preferred_dates_count,
              profiles:requester_id(first_name, last_name)
            `)
            .eq('id', swap.myRequestId)
            .single(),
            
          supabase
            .from('shift_swap_requests')
            .select(`
              id,
              requester_id,
              status,
              created_at,
              preferred_dates_count,
              profiles:requester_id(first_name, last_name)
            `)
            .eq('id', swap.otherRequestId)
            .single()
        ]);
        
        // Process my request results
        if (myRequestResult.error) {
          console.error('Error fetching my request details:', myRequestResult.error);
          
          // Check if this is a permissions error
          if (myRequestResult.error.code === '42501') {
            toast({
              title: "Permission denied",
              description: "You don't have permission to view this request details",
              variant: "destructive"
            });
          }
        } else if (myRequestResult.data) {
          const profiles = myRequestResult.data.profiles as any;
          const requesterName = profiles 
            ? `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() 
            : 'Unknown User';
            
          setMyRequestDetails({
            id: myRequestResult.data.id,
            requester_id: myRequestResult.data.requester_id,
            requester_name: requesterName,
            created_at: new Date(myRequestResult.data.created_at).toLocaleString(),
            status: myRequestResult.data.status
          });
          
          // Set the original requester info from the data
          setRequesterInfo({
            id: myRequestResult.data.requester_id,
            userName: requesterName
          });
        }
        
        // Process other request results
        if (otherRequestResult.error) {
          console.error('Error fetching other request details:', otherRequestResult.error);
        } else if (otherRequestResult.data) {
          const profiles = otherRequestResult.data.profiles as any;
          const requesterName = profiles 
            ? `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() 
            : 'Unknown User';
            
          setOtherRequestDetails({
            id: otherRequestResult.data.id,
            requester_id: otherRequestResult.data.requester_id,
            requester_name: requesterName,
            created_at: new Date(otherRequestResult.data.created_at).toLocaleString(),
            status: otherRequestResult.data.status
          });
        }
        
      } catch (error) {
        console.error('Error in fetchRequestDetails:', error);
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

MY REQUEST:
Request ID: ${swap.myRequestId}
Requester ID: ${myRequestDetails?.requester_id || requesterInfo?.id || 'Not available'}
Requester Name: ${myRequestDetails?.requester_name || requesterInfo?.userName || 'Not available'}
Request Created: ${myRequestDetails?.created_at || 'Not available'}
Request Status: ${myRequestDetails?.status || 'Not available'}

OTHER REQUEST:
Request ID: ${swap.otherRequestId}
Requester ID: ${otherRequestDetails?.requester_id || 'Not available'}
Requester Name: ${otherRequestDetails?.requester_name || 'Not available'}
Request Created: ${otherRequestDetails?.created_at || 'Not available'}
Request Status: ${otherRequestDetails?.status || 'Not available'}

YOUR SHIFT:
Date: ${formatDate(swap.myShift.date)}
Time: ${swap.myShift.startTime} - ${swap.myShift.endTime}
Colleague Type: ${swap.myShift.colleagueType || 'Not specified'}
${swap.myShift.employeeId ? `Service#: ${swap.myShift.employeeId}` : ''}
${swap.myShift.truckName ? `Location: ${swap.myShift.truckName}` : ''}

THEIR SHIFT:
Person: ${swap.otherShift.userName || 'Unknown User'}
Date: ${formatDate(swap.otherShift.date)}
Time: ${swap.otherShift.startTime} - ${swap.otherShift.endTime}
Colleague Type: ${swap.otherShift.colleagueType || 'Not specified'}
${swap.otherShift.employeeId ? `Service#: ${swap.otherShift.employeeId}` : ''}
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
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          {/* Request Information */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Status</h3>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusDisplay.colorClass}`}>
              {statusDisplay.text}
            </span>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-md space-y-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Match ID: {swap.id}</span>
              
              {/* My Request Section */}
              <div className="mt-3 pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold">My Request:</span>
                <div className="pl-4 space-y-1 mt-1">
                  <span className="text-sm">Request ID: {swap.myRequestId}</span>
                  {isLoading ? (
                    <span className="text-sm italic text-muted-foreground">Loading details...</span>
                  ) : myRequestDetails ? (
                    <>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Requester ID: {myRequestDetails.requester_id}</span>
                      </div>
                      <span className="text-sm pl-6">Requester Name: {myRequestDetails.requester_name}</span>
                      <div className="flex items-center">
                        <Clock8 className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Created: {myRequestDetails.created_at}</span>
                      </div>
                      <span className="text-sm pl-6">Status: {myRequestDetails.status}</span>
                    </>
                  ) : (
                    <span className="text-sm italic text-muted-foreground">Could not load details</span>
                  )}
                </div>
              </div>
              
              {/* Other Request Section */}
              <div className="mt-3 pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold">Other Request:</span>
                <div className="pl-4 space-y-1 mt-1">
                  <span className="text-sm">Request ID: {swap.otherRequestId}</span>
                  {isLoading ? (
                    <span className="text-sm italic text-muted-foreground">Loading details...</span>
                  ) : otherRequestDetails ? (
                    <>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Requester ID: {otherRequestDetails.requester_id}</span>
                      </div>
                      <span className="text-sm pl-6">Requester Name: {otherRequestDetails.requester_name}</span>
                      <div className="flex items-center">
                        <Clock8 className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Created: {otherRequestDetails.created_at}</span>
                      </div>
                      <span className="text-sm pl-6">Status: {otherRequestDetails.status}</span>
                    </>
                  ) : (
                    <span className="text-sm italic text-muted-foreground">Could not load details</span>
                  )}
                </div>
              </div>
            </div>
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
              
              <div className="flex items-center">
                <UserCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{swap.myShift.colleagueType || 'Not specified'}</span>
              </div>
              
              {swap.myShift.employeeId && (
                <div className="flex items-center col-span-2">
                  <Badge className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm"><strong>Service#:</strong> {swap.myShift.employeeId}</span>
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
                {swap.otherShift.userName || 'Unknown User'}
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
              
              <div className="flex items-center">
                <UserCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{swap.otherShift.colleagueType || 'Not specified'}</span>
              </div>
              
              {swap.otherShift.employeeId && (
                <div className="flex items-center col-span-2">
                  <Badge className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm"><strong>Service#:</strong> {swap.otherShift.employeeId}</span>
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
