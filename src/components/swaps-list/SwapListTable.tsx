
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
import { format } from 'date-fns';
import ShiftTypeBadge from '@/components/swaps/ShiftTypeBadge';
import { SwapListItem } from '@/hooks/useSwapList';

interface SwapListTableProps {
  requests: SwapListItem[];
  onOffer: (requestId: string) => void;
}

const SwapListTable = ({ requests, onOffer }: SwapListTableProps) => {
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
            <TableHead>Preferred Dates</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(request => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">
                {request.preferrer?.name || 'Unknown user'}
                {request.preferrer?.employeeId && (
                  <div className="text-xs text-muted-foreground">
                    ID: {request.preferrer.employeeId}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {format(new Date(request.originalShift.date), 'EEE, d MMM')}
              </TableCell>
              <TableCell>
                {request.originalShift.startTime} - {request.originalShift.endTime}
              </TableCell>
              <TableCell>
                <ShiftTypeBadge type={request.originalShift.type} size="sm" />
              </TableCell>
              <TableCell>
                <Badge variant="outline">{request.originalShift.colleagueType}</Badge>
              </TableCell>
              <TableCell>
                {request.originalShift.title}
              </TableCell>
              <TableCell>
                {request.preferredDates.length > 0 ? (
                  <>
                    {request.preferredDates.slice(0, 2).map(date => (
                      <div key={date.id} className="text-xs">
                        {format(new Date(date.date), 'dd/MM/yyyy')}
                      </div>
                    ))}
                    {request.preferredDates.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{request.preferredDates.length - 2} more
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SwapListTable;
