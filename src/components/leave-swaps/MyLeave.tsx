import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Scissors, ArrowLeftRight } from 'lucide-react';
import { useLeaveBlocks } from '@/hooks/leave-blocks';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { UserLeaveBlock } from '@/types/leave-blocks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

const MyLeave = () => {
  const { leaveBlocks, isLoading, refreshLeaveBlocks, createLeaveSwapRequest, splitLeaveBlock, joinLeaveBlocks } = useLeaveBlocks();
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<UserLeaveBlock | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<{blockA?: UserLeaveBlock, blockB?: UserLeaveBlock}>({});

  const handleSplitRequest = async () => {
    if (!selectedBlock) return;
    
    setProcessingAction(true);
    try {
      const success = await splitLeaveBlock(selectedBlock.id);
      if (success) {
        setSplitDialogOpen(false);
        setSelectedBlock(null);
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!selectedBlocks.blockA || !selectedBlocks.blockB) return;
    
    setProcessingAction(true);
    try {
      await joinLeaveBlocks(selectedBlocks.blockA.id, selectedBlocks.blockB.id);
      setJoinDialogOpen(false);
      setSelectedBlocks({});
    } finally {
      setProcessingAction(false);
    }
  };

  const toggleBlockSelection = (block: UserLeaveBlock) => {
    if (block.split_designation === 'A') {
      if (selectedBlocks.blockA?.id === block.id) {
        setSelectedBlocks(prev => ({ ...prev, blockA: undefined }));
      } else {
        setSelectedBlocks(prev => ({ ...prev, blockA: block }));
      }
    } else if (block.split_designation === 'B') {
      if (selectedBlocks.blockB?.id === block.id) {
        setSelectedBlocks(prev => ({ ...prev, blockB: undefined }));
      } else {
        setSelectedBlocks(prev => ({ ...prev, blockB: block }));
      }
    }
  };

  const canJoinBlocks = () => {
    return selectedBlocks.blockA && 
           selectedBlocks.blockB && 
           selectedBlocks.blockA.original_block_id === selectedBlocks.blockB.original_block_id;
  };

  // Group blocks by their original block ID or own ID if they're not split
  const groupedBlocks = leaveBlocks.reduce((acc, block) => {
    const key = block.original_block_id || block.id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(block);
    return acc;
  }, {} as Record<string, UserLeaveBlock[]>);

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setJoinDialogOpen(true)}
              disabled={!Object.values(groupedBlocks).some(group => group.length > 1)}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Join Blocks
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refreshLeaveBlocks()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
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
              {Object.entries(groupedBlocks).map(([groupId, blocks]) => (
                <div key={groupId} className="border rounded-md p-4">
                  {blocks.length === 1 && !blocks[0].split_designation ? (
                    // Single block display
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          Block {blocks[0].block_number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(blocks[0].start_date), 'MMM d, yyyy')} - 
                          {format(new Date(blocks[0].end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => {
                            setSelectedBlock(blocks[0]);
                            setSplitDialogOpen(true);
                          }}
                        >
                          <Scissors className="h-4 w-4 mr-2" />
                          Split Block
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => createLeaveSwapRequest(blocks[0].id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Request swap
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display split blocks
                    <div>
                      <div className="mb-2">
                        <p className="font-medium">Block {blocks[0].block_number} (Split)</p>
                      </div>
                      <div className="space-y-3">
                        {blocks.map((block) => (
                          <div 
                            key={block.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pl-4 border-l-4 border-gray-200"
                          >
                            <div>
                              <p className="font-medium">
                                Block {block.block_number}{block.split_designation ? ` (${block.split_designation})` : ''}
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Split Block Dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Split Leave Block</DialogTitle>
            <DialogDescription>
              Are you sure you want to split this leave block into two equal parts?
            </DialogDescription>
          </DialogHeader>
          {selectedBlock && (
            <div className="py-4">
              <p><span className="font-semibold">Block:</span> {selectedBlock.block_number}</p>
              <p><span className="font-semibold">Dates:</span> {format(new Date(selectedBlock.start_date), 'MMM d, yyyy')} - {format(new Date(selectedBlock.end_date), 'MMM d, yyyy')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitDialogOpen(false)} disabled={processingAction}>Cancel</Button>
            <Button onClick={handleSplitRequest} disabled={processingAction}>
              {processingAction && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Split Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Blocks Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Leave Blocks</DialogTitle>
            <DialogDescription>
              Select two split blocks (A and B) to join them back into a single block.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              {Object.entries(groupedBlocks)
                .filter(([_, blocks]) => blocks.length > 1)
                .map(([groupId, blocks]) => (
                  <div key={groupId} className="border rounded-md p-3">
                    <p className="font-medium mb-2">Block {blocks[0].block_number}</p>
                    <div className="space-y-2">
                      {blocks.map((block) => (
                        <div 
                          key={block.id}
                          className={`p-2 rounded-md cursor-pointer border ${
                            (block.split_designation === 'A' && selectedBlocks.blockA?.id === block.id) ||
                            (block.split_designation === 'B' && selectedBlocks.blockB?.id === block.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                          onClick={() => toggleBlockSelection(block)}
                        >
                          <p>
                            Block {block.block_number}{block.split_designation && ` (${block.split_designation})`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(block.start_date), 'MMM d, yyyy')} - {format(new Date(block.end_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} disabled={processingAction}>Cancel</Button>
            <Button 
              onClick={handleJoinRequest} 
              disabled={!canJoinBlocks() || processingAction}
            >
              {processingAction && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Join Blocks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyLeave;
