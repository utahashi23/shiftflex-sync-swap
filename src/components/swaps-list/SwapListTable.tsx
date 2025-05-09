
import { ArrowRight } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isValid, parseISO } from 'date-fns';
import ShiftTypeBadge from '@/components/swaps/ShiftTypeBadge';
import { SwapListItem } from '@/hooks/useSwapList';

interface SwapListTableProps {
  requests: SwapListItem[];
  onOffer: (requestId: string) => void;
}

const SwapListTable = ({ requests, onOffer }: SwapListTableProps) => {
  // Safely format the date, handling potential invalid date values
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    
    try {
      // Try to parse the date string (handles both ISO and YYYY-MM-DD formats)
      const date = parseISO(dateString);
      
      // Check if the date is valid before formatting
      if (isValid(date)) {
        return format(date, 'EEE, d MMM');
      }
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };
  
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No swap requests found</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Shift Type</TableHead>
            <TableHead>Colleague Type</TableHead>
            <TableHead>Truck</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(request => {
            // If originalShift is missing, log and skip
            if (!request.originalShift) {
              console.error('Missing originalShift data in request:', request);
              return null;
            }
            
            return (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  {request.preferrer?.name || 'Unknown user'}
                  {request.preferrer?.employeeId && (
                    <div className="text-xs text-muted-foreground">
                      {request.preferrer.employeeId}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {formatDate(request.originalShift.date)}
                </TableCell>
                <TableCell>
                  {request.originalShift.startTime || 'N/A'} - {request.originalShift.endTime || 'N/A'}
                </TableCell>
                <TableCell>
                  <ShiftTypeBadge type={request.originalShift.type || 'day'} size="sm" />
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{request.originalShift.colleagueType || 'Not specified'}</Badge>
                </TableCell>
                <TableCell>
                  {request.originalShift.title || 'Unnamed'}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => onOffer(request.id)}
                    className="w-full flex items-center justify-center"
                  >
                    Offer <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          }).filter(Boolean)}
        </TableBody>
      </Table>
    </div>
  );
};

export default SwapListTable;
