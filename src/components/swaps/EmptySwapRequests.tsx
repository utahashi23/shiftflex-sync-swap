
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from 'lucide-react';

const EmptySwapRequests = () => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-xl font-medium">No Swap Requests</h3>
        <p className="text-muted-foreground mt-2">
          You haven't requested any shift swaps yet.
        </p>
      </CardContent>
    </Card>
  );
};

export default EmptySwapRequests;
