
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Calendar, Trash } from 'lucide-react';
import { useLeaveBlocks } from '@/hooks/leave-blocks/useLeaveBlocks';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MyLeave = () => {
  const [selectedLeaveBlockId, setSelectedLeaveBlockId] = useState<string>('');
  const {
    allLeaveBlocks,
    userLeaveBlocks,
    isLoadingLeaveBlocks,
    isLoadingUserLeaveBlocks,
    leaveBlocksError,
    userLeaveBlocksError,
    addLeaveBlock,
    isAddingLeaveBlock,
    removeLeaveBlock,
    isRemovingLeaveBlock,
    formatDate
  } = useLeaveBlocks();
  
  const handleAddLeaveBlock = () => {
    if (!selectedLeaveBlockId) return;
    
    addLeaveBlock({ leaveBlockId: selectedLeaveBlockId });
    setSelectedLeaveBlockId('');
  };
  
  const handleRemoveLeaveBlock = (userLeaveBlockId: string) => {
    removeLeaveBlock({ userLeaveBlockId });
  };
  
  // Filter out leave blocks that the user already has
  const availableLeaveBlocks = allLeaveBlocks?.filter(block => 
    !userLeaveBlocks?.some(userBlock => 
      userBlock.leave_block_id === block.id
    )
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>My Leave Blocks</CardTitle>
          <CardDescription>
            Manage the leave blocks assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userLeaveBlocksError ? (
            <Alert variant="destructive">
              <AlertTitle>Error loading leave blocks</AlertTitle>
              <AlertDescription>
                {userLeaveBlocksError.message}
              </AlertDescription>
            </Alert>
          ) : isLoadingUserLeaveBlocks ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : userLeaveBlocks?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              You don't have any leave blocks yet. Add a leave block below.
            </p>
          ) : (
            <Table>
              <TableCaption>Your assigned leave blocks</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Block</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userLeaveBlocks?.map(block => (
                  <TableRow key={block.id}>
                    <TableCell className="font-medium">{block.block_number}</TableCell>
                    <TableCell>{formatDate(block.start_date)}</TableCell>
                    <TableCell>{formatDate(block.end_date)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveLeaveBlock(block.id)}
                        disabled={isRemovingLeaveBlock}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Leave Block</CardTitle>
          <CardDescription>
            Add a leave block to your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaveBlocksError ? (
            <Alert variant="destructive">
              <AlertTitle>Error loading leave blocks</AlertTitle>
              <AlertDescription>
                {leaveBlocksError.message}
              </AlertDescription>
            </Alert>
          ) : isLoadingLeaveBlocks ? (
            <Skeleton className="h-10 w-full" />
          ) : availableLeaveBlocks?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No more leave blocks available to add.
            </p>
          ) : (
            <div className="flex gap-2">
              <Select value={selectedLeaveBlockId} onValueChange={setSelectedLeaveBlockId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a leave block" />
                </SelectTrigger>
                <SelectContent>
                  {availableLeaveBlocks?.map(block => (
                    <SelectItem key={block.id} value={block.id}>
                      Block {block.block_number} ({formatDate(block.start_date)} - {formatDate(block.end_date)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddLeaveBlock} 
                disabled={!selectedLeaveBlockId || isAddingLeaveBlock}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Add Block
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyLeave;
