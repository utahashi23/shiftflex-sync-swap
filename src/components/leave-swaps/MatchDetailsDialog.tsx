
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { LeaveSwapMatch } from '@/types/leave-blocks';
import { useToast } from '@/hooks/use-toast';

interface MatchDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: LeaveSwapMatch | null;
}

const MatchDetailsDialog = ({ open, onOpenChange, match }: MatchDetailsDialogProps) => {
  const { toast } = useToast();
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const copyToClipboard = () => {
    if (!match) return;
    
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

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Swap Details</DialogTitle>
          <DialogDescription>
            Review the details of this leave block swap
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Status</h3>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              match.match_status === 'pending' ? 'bg-amber-100 text-amber-800' :
              match.match_status === 'accepted' ? 'bg-blue-100 text-blue-800' :
              match.match_status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {match.match_status.charAt(0).toUpperCase() + match.match_status.slice(1)}
            </span>
          </div>
          
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
