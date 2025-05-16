
import { useState, useEffect } from 'react';
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
import { Calendar, Trash, Split, Link } from 'lucide-react';
import { useLeaveBlocks } from '@/hooks/leave-blocks/useLeaveBlocks';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const MyLeave = () => {
  const [selectedLeaveBlockId, setSelectedLeaveBlockId] = useState<string>('');
  const [selectedPairIds, setSelectedPairIds] = useState<string[]>([]);
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
    splitLeaveBlock,
    isSplittingLeaveBlock,
    joinLeaveBlocks,
    isJoiningLeaveBlocks,
    formatDate,
    arePairedSplitBlocks,
    findBlockPair
  } = useLeaveBlocks();

  // Reset selected pair when userLeaveBlocks changes
  useEffect(() => {
    setSelectedPairIds([]);
  }, [userLeaveBlocks]);
  
  const handleAddLeaveBlock = () => {
    if (!selectedLeaveBlockId) return;
    
    addLeaveBlock({ leaveBlockId: selectedLeaveBlockId });
    setSelectedLeaveBlockId('');
  };
  
  const handleRemoveLeaveBlock = (userLeaveBlockId: string) => {
    removeLeaveBlock({ userLeaveBlockId });
  };
  
  const handleSplitLeaveBlock = (userLeaveBlockId: string) => {
    splitLeaveBlock({ userLeaveBlockId });
  };
  
  const handleJoinLeaveBlocks = () => {
    if (selectedPairIds.length !== 2) return;
    
    // Find blocks with 'A' and 'B' designations
    const blockA = userLeaveBlocks?.find(block => 
      block.id === selectedPairIds[0] && block.split_designation === 'A'
    );
    const blockB = userLeaveBlocks?.find(block => 
      block.id === selectedPairIds[0] && block.split_designation === 'B'
    );
    
    // If the first selected block isn't A, check the second one
    let blockAId, blockBId;
    if (blockA) {
      blockAId = selectedPairIds[0];
      blockBId = selectedPairIds[1];
    } else {
      blockAId = selectedPairIds[1];
      blockBId = selectedPairIds[0];
    }
    
    joinLeaveBlocks({ blockAId, blockBId });
    setSelectedPairIds([]);
  };
  
  const toggleBlockSelection = (userLeaveBlockId: string) => {
    setSelectedPairIds(prev => {
      if (prev.includes(userLeaveBlockId)) {
        return prev.filter(id => id !== userLeaveBlockId);
      } else {
        // Only allow selecting up to 2 blocks
        if (prev.length < 2) {
          return [...prev, userLeaveBlockId];
        }
        return prev;
      }
    });
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
            <>
              <Table>
                <TableCaption>Your assigned leave blocks</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Block</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLeaveBlocks?.map(block => (
                    <TableRow key={block.id} className={selectedPairIds.includes(block.id) ? "bg-muted/50" : ""}>
                      <TableCell className="font-medium">
                        {block.block_number}
                        {block.split_designation && (
                          <Badge className="ml-2" variant={block.split_designation === 'A' ? "outline" : "secondary"}>
                            {block.split_designation}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(block.start_date)}</TableCell>
                      <TableCell>{formatDate(block.end_date)}</TableCell>
                      <TableCell>{block.status}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {block.split_designation ? (
                            // For split blocks, show the join button if this block is selected
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleBlockSelection(block.id)}
                              className={
                                selectedPairIds.includes(block.id) ? "bg-primary/20" : ""
                              }
                            >
                              {selectedPairIds.includes(block.id) ? "Selected" : "Select to Join"}
                            </Button>
                          ) : (
                            // For non-split blocks, show the split button
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSplitLeaveBlock(block.id)}
                              disabled={isSplittingLeaveBlock}
                            >
                              <Split className="h-4 w-4 mr-1" />
                              Split
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveLeaveBlock(block.id)}
                            disabled={isRemovingLeaveBlock}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {selectedPairIds.length === 2 && arePairedSplitBlocks(selectedPairIds[0], selectedPairIds[1]) && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleJoinLeaveBlocks}
                    disabled={isJoiningLeaveBlocks}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Join Selected Blocks
                  </Button>
                </div>
              )}
            </>
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
