
import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const MatchCardSkeleton = () => {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded"></div>
          <div className="h-3 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-5 w-16 bg-gray-200 rounded"></div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-100 rounded-md h-24"></div>
          <div className="p-3 bg-gray-100 rounded-md h-24"></div>
        </div>
        
        <div className="flex justify-end mt-4">
          <div className="h-9 w-28 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCardSkeleton;
