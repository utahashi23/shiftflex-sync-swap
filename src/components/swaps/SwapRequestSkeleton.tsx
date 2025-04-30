
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const SwapRequestSkeleton = () => {
  return (
    <Card className="animate-pulse">
      <CardHeader className="bg-gray-100 h-16"></CardHeader>
      <CardContent className="py-8">
        <div className="space-y-4">
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SwapRequestSkeleton;
