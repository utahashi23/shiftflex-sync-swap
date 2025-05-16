
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, FileText } from 'lucide-react';
import { LeaveSwapMatch } from '@/types/leave-blocks';

interface MatchTableProps {
  matches: LeaveSwapMatch[];
  isPast?: boolean;
  onViewDetails: (matchId: string) => void;
  onAccept?: (matchId: string) => void;
  onFinalize?: (matchId: string) => void;
  onCancel?: (matchId: string) => void;
  isAcceptingMatch?: boolean;
  isFinalizingMatch?: boolean;
  isCancellingMatch?: boolean;
}

const MatchTable = ({
  matches,
  isPast = false,
  onViewDetails,
  onAccept,
  onFinalize,
  onCancel,
  isAcceptingMatch,
  isFinalizingMatch,
  isCancellingMatch
}: MatchTableProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'accepted':
        return <Badge variant="secondary">Accepted</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (matches.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {isPast 
          ? "You don't have any past matches."
          : "You don't have any active matches. Use the \"Find Matches\" button to search for potential swaps."
        }
      </p>
    );
  }

  return (
    <Table>
      <TableCaption>{isPast ? "Your past leave swap matches" : "Your active leave swap matches"}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>My Block</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Other Block</TableHead>
          <TableHead>Other User</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matches.map(match => (
          <TableRow key={match.match_id}>
            <TableCell className="font-medium">{match.my_block_number}</TableCell>
            <TableCell>
              {formatDate(match.my_start_date)} - {formatDate(match.my_end_date)}
            </TableCell>
            <TableCell>{match.other_block_number}</TableCell>
            <TableCell>
              {match.other_user_name} <span className="text-xs text-gray-500">({match.other_employee_id || 'N/A'})</span>
            </TableCell>
            <TableCell>{getStatusBadge(match.match_status)}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewDetails(match.match_id)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Details
                </Button>
                
                {!isPast && match.match_status === 'pending' && onAccept && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => onAccept(match.match_id)}
                    disabled={isAcceptingMatch}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                )}
                
                {!isPast && match.match_status === 'accepted' && (
                  <>
                    {onCancel && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onCancel(match.match_id)}
                        disabled={isCancellingMatch}
                        className="text-red-600 hover:bg-red-50 border-red-200"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                    
                    {onFinalize && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => onFinalize(match.match_id)}
                        disabled={isFinalizingMatch}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Finalize
                      </Button>
                    )}
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default MatchTable;
