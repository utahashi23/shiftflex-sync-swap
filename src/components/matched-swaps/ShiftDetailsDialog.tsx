
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar, Clock, Copy, UserCircle2, Info, Badge } from "lucide-react";
import { useState } from "react";
import { SwapMatch } from "./types";
import ShiftTypeBadge from "../swaps/ShiftTypeBadge";
import { toast } from "@/hooks/use-toast";

interface ShiftDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swap: SwapMatch | null;
}

export function ShiftDetailsDialog({ 
  open, 
  onOpenChange, 
  swap 
}: ShiftDetailsDialogProps) {
  const [copied, setCopied] = useState(false);
  
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
Requester Request ID: ${swap.myRequestId}

Your Shift:
Date: ${formatDate(swap.myShift.date)}
Time: ${swap.myShift.startTime} - ${swap.myShift.endTime}
Colleague Type: ${swap.myShift.colleagueType || 'Not specified'}
${swap.myShift.employeeId ? `Service#: ${swap.myShift.employeeId}` : ''}
${swap.myShift.truckName ? `Location: ${swap.myShift.truckName}` : ''}

Their Shift:
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
          
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Match ID: {swap.id}</span>
              <span className="text-sm">Requester Request ID: {swap.myRequestId}</span>
              <span className="text-sm">Other Request ID: {swap.otherRequestId}</span>
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
