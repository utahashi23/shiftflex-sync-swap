
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Calendar } from 'lucide-react';

const NoSwapsState = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-muted/30 p-6 rounded-full mb-4">
        <ArrowRightLeft className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No Swap Requests</h3>
      <p className="text-muted-foreground mb-6">
        You haven't requested any shift swaps yet.
      </p>
      <Button onClick={() => window.location.href = '/shifts'}>
        <Calendar className="h-4 w-4 mr-2" />
        Go to Calendar
      </Button>
    </div>
  );
};

export default NoSwapsState;
