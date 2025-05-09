
import { ArrowRight } from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import ShiftTypeIcon from '@/components/swaps/ShiftTypeIcon';
import ShiftTypeBadge from '@/components/swaps/ShiftTypeBadge';
import { SwapListItem } from '@/hooks/useSwapList';

interface SwapListCardProps {
  request: SwapListItem;
  onOffer: (requestId: string) => void;
}

const SwapListCard = ({ request, onOffer }: SwapListCardProps) => {
  const { originalShift, preferrer } = request;
  
  // Safely format the date, handling potential invalid date values
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if the date is valid before formatting
      if (isValid(date)) {
        return format(date, 'EEE, d MMM yyyy');
      }
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-secondary/30 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-2">
              <ShiftTypeIcon type={originalShift.type} className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{originalShift.title}</h3>
              <p className="text-xs text-muted-foreground">
                {preferrer?.name || 'Unknown user'} 
                {preferrer?.employeeId && ` (${preferrer.employeeId})`}
              </p>
            </div>
          </div>
          <ShiftTypeBadge type={originalShift.type} size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">
              {formatDate(originalShift.date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="font-medium">{originalShift.startTime} - {originalShift.endTime}</p>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-muted-foreground mb-1">Colleague Type</p>
          <Badge variant="outline">{originalShift.colleagueType}</Badge>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 pb-4 border-t">
        <Button 
          className="w-full" 
          onClick={() => onOffer(request.id)}
        >
          Offer Swap <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SwapListCard;
