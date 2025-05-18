import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useLeaveBlocks } from '@/hooks/leave-blocks';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const MyLeave = () => {
  const { leaveBlocks, isLoading, refreshLeaveBlocks, createLeaveSwapRequest } = useLeaveBlocks();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Leave Blocks</CardTitle>
            <CardDescription>
              View your allocated leave blocks
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refreshLeaveBlocks()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : leaveBlocks.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No leave blocks allocated yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveBlocks.map((block) => (
                <div
                  key={block.id}
                  className="border rounded-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium">
                      Block {block.block_number}
                      {block.split_designation && <span className="ml-1">({block.split_designation})</span>}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(block.start_date), 'MMM d, yyyy')} - 
                      {format(new Date(block.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => createLeaveSwapRequest(block.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Request swap
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyLeave;
