
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SwapMatch } from "@/hooks/swap-matches/types";
import { Calendar, Clock, Clipboard, UserCircle2, IdCard } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ShiftDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swap: SwapMatch | null;
}

export function ShiftDetailsDialog({ open, onOpenChange, swap }: ShiftDetailsDialogProps) {
  const [copied, setCopied] = useState(false);

  // Format date to a readable string
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Generate text for clipboard
  const getClipboardText = () => {
    if (!swap) return "";
    
    return `Swap Details:
-------------------
Status: ${swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}

Your Shift:
Date: ${formatDate(swap.myShift.date)}
Time: ${swap.myShift.startTime} - ${swap.myShift.endTime}
Type: ${swap.myShift.colleagueType}
${swap.myShift.employeeId ? `Service#: ${swap.myShift.employeeId}` : ''}
${swap.myShift.truckName ? `Location: ${swap.myShift.truckName}` : ''}

Matched Shift:
Date: ${formatDate(swap.otherShift.date)}
Time: ${swap.otherShift.startTime} - ${swap.otherShift.endTime}
Colleague: ${swap.otherShift.userName}
Type: ${swap.otherShift.colleagueType}
${swap.otherShift.employeeId ? `Service#: ${swap.otherShift.employeeId}` : ''}
${swap.otherShift.truckName ? `Location: ${swap.otherShift.truckName}` : ''}

Swap ID: ${swap.id}
Created: ${new Date(swap.createdAt).toLocaleString()}`;
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    if (!swap) return;
    
    navigator.clipboard.writeText(getClipboardText())
      .then(() => {
        setCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "Swap details have been copied to your clipboard",
        });
        
        // Reset copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Error copying to clipboard:', err);
        toast({
          title: "Failed to copy",
          description: "Could not copy to clipboard. Please try again.",
          variant: "destructive",
        });
      });
  };

  if (!swap) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Swap Details</DialogTitle>
          <DialogDescription>
            Full details about this shift swap
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
            </span>
          </div>
          
          {/* Divider */}
          <div className="border-t"></div>
          
          {/* Your Shift */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Your Shift</h3>
            <div className="space-y-2 p-3 border rounded-md">
              <div className="flex items-start">
                <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <span>{formatDate(swap.myShift.date)}</span>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <span>{swap.myShift.startTime} - {swap.myShift.endTime}</span>
              </div>
              
              <div className="flex items-start">
                <UserCircle2 className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <span>{swap.myShift.colleagueType}</span>
              </div>
              
              {swap.myShift.employeeId && (
                <div className="flex items-start">
                  <IdCard className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <span>Service#: {swap.myShift.employeeId}</span>
                </div>
              )}
              
              {swap.myShift.truckName && (
                <div className="text-sm text-muted-foreground mt-1">
                  Location: {swap.myShift.truckName}
                </div>
              )}
            </div>
          </div>
          
          {/* Their Shift */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Matched Shift</h3>
            <div className="space-y-2 p-3 border rounded-md">
              <div className="flex items-start">
                <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <span>{formatDate(swap.otherShift.date)}</span>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <span>{swap.otherShift.startTime} - {swap.otherShift.endTime}</span>
              </div>
              
              <div className="flex items-start">
                <UserCircle2 className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                <span>{swap.otherShift.colleagueType}</span>
              </div>
              
              <div className="text-sm font-medium">
                Colleague: {swap.otherShift.userName}
              </div>
              
              {swap.otherShift.employeeId && (
                <div className="flex items-start">
                  <IdCard className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <span>Service#: {swap.otherShift.employeeId}</span>
                </div>
              )}
              
              {swap.otherShift.truckName && (
                <div className="text-sm text-muted-foreground mt-1">
                  Location: {swap.otherShift.truckName}
                </div>
              )}
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="text-xs text-muted-foreground">
            <div>Swap ID: {swap.id.substring(0, 8)}...</div>
            <div>Created: {new Date(swap.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleCopy}
            className="flex items-center"
          >
            <Clipboard className="h-4 w-4 mr-2" />
            {copied ? "Copied!" : "Copy Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
