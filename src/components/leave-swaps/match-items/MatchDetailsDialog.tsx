
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from 'lucide-react';
import { LeaveSwapMatch } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';

interface MatchDetailsDialogProps {
  match: LeaveSwapMatch | null;
  isOpen: boolean;
  onClose: () => void;
}

const MatchDetailsDialog: React.FC<MatchDetailsDialogProps> = ({ match, isOpen, onClose }) => {
  const { toast } = useToast();

  if (!match) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const copyToClipboard = () => {
    // Create a comprehensive formatted text with all swap details
    const swapDetails = `
LEAVE BLOCK SWAP DETAILS

MY DETAILS
Name: ${match.my_user_name}
Service Number: ${match.my_employee_id || 'N/A'}
Leave Block: ${match.my_block_number} (${formatDate(match.my_start_date)} - ${formatDate(match.my_end_date)})

OTHER USER DETAILS
Name: ${match.other_user_name}
Service Number: ${match.other_employee_id || 'N/A'}
Leave Block: ${match.other_block_number} (${formatDate(match.other_start_date)} - ${formatDate(match.other_end_date)})

Status: ${match.match_status.toUpperCase()}
`;

    navigator.clipboard.writeText(swapDetails).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "All leave swap details have been copied to your clipboard.",
      });
    }).catch(err => {
      console.error('Could not copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy text to clipboard.",
        variant: "destructive",
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Swap Details</DialogTitle>
          <DialogDescription>
            View the details of this leave swap match
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2 border-b pb-2">
            <h3 className="text-sm font-semibold">Your Details</h3>
            <p><strong>Name:</strong> {match.my_user_name} <span className="text-xs text-gray-500">({match.my_employee_id || 'N/A'})</span></p>
            <p><strong>Block:</strong> {match.my_block_number} ({formatDate(match.my_start_date)} - {formatDate(match.my_end_date)})</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">Other User Details</h3>
              <Button 
                variant="secondary" 
                size="sm"
                className="flex items-center gap-1"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4" />
                Copy All Details
              </Button>
            </div>
            <p><strong>Name:</strong> {match.other_user_name} <span className="text-xs text-gray-500">({match.other_employee_id || 'N/A'})</span></p>
            <p><strong>Block:</strong> {match.other_block_number} ({formatDate(match.other_start_date)} - {formatDate(match.other_end_date)})</p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MatchDetailsDialog;
