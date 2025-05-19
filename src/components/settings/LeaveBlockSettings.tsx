import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { LeaveBlock, UserLeaveBlock } from '@/types/leave-blocks';
import { useAuth } from '@/hooks/auth';
import { useLeaveBlocks } from '@/hooks/leave-blocks';
import { Calendar, Trash2, Plus, Edit } from 'lucide-react';

export const LeaveBlockSettings = () => {
  const { isAdmin, user } = useAuth();
  const { leaveBlocks, isLoading, refreshLeaveBlocks, splitLeaveBlock, joinLeaveBlocks } = useLeaveBlocks();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<UserLeaveBlock | null>(null);

  useEffect(() => {
    // When component mounts, fetch leave blocks
    if (user) {
      refreshLeaveBlocks();
    }
  }, [user, refreshLeaveBlocks]);

  const handleSplitBlock = async (blockId: string) => {
    if (confirm('Are you sure you want to split this leave block into two parts?')) {
      const success = await splitLeaveBlock(blockId);
      if (success) {
        refreshLeaveBlocks();
      }
    }
  };

  const handleJoinBlocks = async (blockAId: string, blockBId: string) => {
    if (confirm('Are you sure you want to join these blocks back together?')) {
      const success = await joinLeaveBlocks(blockAId, blockBId);
      if (success) {
        refreshLeaveBlocks();
      }
    }
  };

  const viewBlockDetails = (block: UserLeaveBlock) => {
    setCurrentBlock(block);
    setShowDetailsDialog(true);
  };

  // For regular users, show their assigned leave blocks
  const renderUserLeaveBlocks = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      );
    }

    if (leaveBlocks.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          No leave blocks assigned to you. Please contact your administrator.
        </div>
      );
    }

    // Group blocks by their original block (for split blocks)
    const blockGroups = leaveBlocks.reduce((groups: Record<string, UserLeaveBlock[]>, block) => {
      // If this is a split block, group by original_block_id
      const groupKey = block.original_block_id || block.id;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(block);
      return groups;
    }, {});

    return (
      <div className="space-y-4">
        {Object.entries(blockGroups).map(([groupKey, blocks]) => (
          <Card key={groupKey} className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Block Number</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Split</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-medium">Block {block.block_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(block.start_date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(block.end_date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {block.split_designation ? `Part ${block.split_designation}` : 'No'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewBlockDetails(block)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!block.split_designation && blocks.length === 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSplitBlock(block.id)}
                              title="Split leave block"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          {blocks.length === 2 && block.split_designation === 'A' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleJoinBlocks(blocks[0].id, blocks[1].id)}
                              title="Join blocks"
                            >
                              <Plus className="h-4 w-4 rotate-45" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // If admin, show the original admin view for managing all leave blocks
  const renderAdminLeaveBlocks = () => {
    // This is the existing admin functionality, keep it as is
    const [leaveBlocks, setLeaveBlocks] = useState<LeaveBlock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [currentBlock, setCurrentBlock] = useState<LeaveBlock | null>(null);
    const [formData, setFormData] = useState({
      block_number: '',
      start_date: '',
      end_date: '',
    });
    
    const fetchLeaveBlocks = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('leave_blocks')
          .select('*')
          .order('block_number', { ascending: true })
          .eq('status', 'active');
        
        if (error) throw error;
        
        // Transform the data to ensure split_designation has the correct type
        const transformedData: LeaveBlock[] = (data || []).map(block => ({
          ...block,
          // Convert split_designation to the correct union type
          split_designation: block.split_designation === 'A' ? 'A' : 
                             block.split_designation === 'B' ? 'B' : null
        }));
        
        setLeaveBlocks(transformedData);
      } catch (error) {
        console.error('Error fetching leave blocks:', error);
        toast({
          title: "Error",
          description: "Failed to load leave blocks",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchLeaveBlocks();
    }, []);

    const handleAddBlock = async () => {
      try {
        setIsLoading(true);
        
        const blockNumber = parseInt(formData.block_number);
        
        if (isNaN(blockNumber) || blockNumber <= 0) {
          toast({
            title: "Invalid Input",
            description: "Block number must be a positive integer",
            variant: "destructive"
          });
          return;
        }
        
        if (!formData.start_date || !formData.end_date) {
          toast({
            title: "Missing Dates",
            description: "Please specify both start and end dates",
            variant: "destructive"
          });
          return;
        }
        
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        
        if (endDate <= startDate) {
          toast({
            title: "Invalid Dates",
            description: "End date must be after start date",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('leave_blocks')
        .insert({
          block_number: blockNumber,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: 'active'
        });
      
      if (error) throw error;
      
      toast({
        title: "Block Added",
        description: `Leave block ${blockNumber} has been created`
      });
      
      resetForm();
      setShowAddDialog(false);
      fetchLeaveBlocks();
    } catch (error) {
      console.error('Error adding leave block:', error);
      toast({
        title: "Error",
        description: "Failed to add leave block",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBlock = async () => {
    if (!currentBlock) return;
    
    try {
      setIsLoading(true);
      
      const blockNumber = parseInt(formData.block_number);
      
      if (isNaN(blockNumber) || blockNumber <= 0) {
        toast({
          title: "Invalid Input",
          description: "Block number must be a positive integer",
          variant: "destructive"
        });
        return;
      }
      
      if (!formData.start_date || !formData.end_date) {
        toast({
          title: "Missing Dates",
          description: "Please specify both start and end dates",
          variant: "destructive"
        });
        return;
      }
      
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        toast({
          title: "Invalid Dates",
          description: "End date must be after start date",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('leave_blocks')
        .update({
          block_number: blockNumber,
          start_date: formData.start_date,
          end_date: formData.end_date
        })
        .eq('id', currentBlock.id);
      
      if (error) throw error;
      
      toast({
        title: "Block Updated",
        description: `Leave block ${blockNumber} has been updated`
      });
      
      resetForm();
      setShowEditDialog(false);
      setCurrentBlock(null);
      fetchLeaveBlocks();
    } catch (error) {
      console.error('Error updating leave block:', error);
      toast({
        title: "Error",
        description: "Failed to update leave block",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBlock = async (id: string, blockNumber: number) => {
    if (confirm(`Are you sure you want to delete leave block ${blockNumber}?`)) {
      try {
        setIsLoading(true);
        
        // Get assigned users first to check if block can be deleted
        const { data: assignments, error: assignmentError } = await supabase
          .from('user_leave_blocks')
          .select('id')
          .eq('leave_block_id', id);
        
        if (assignmentError) throw assignmentError;
        
        if (assignments && assignments.length > 0) {
          toast({
            title: "Cannot Delete",
            description: `Block ${blockNumber} is assigned to ${assignments.length} users`,
            variant: "destructive"
          });
          return;
        }
        
        const { error } = await supabase
          .from('leave_blocks')
          .update({ status: 'inactive' })
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: "Block Deleted",
          description: `Leave block ${blockNumber} has been removed`
        });
        
        fetchLeaveBlocks();
      } catch (error) {
        console.error('Error deleting leave block:', error);
        toast({
          title: "Error",
          description: "Failed to delete leave block",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const editBlock = (block: LeaveBlock) => {
    setCurrentBlock(block);
    setFormData({
      block_number: block.block_number.toString(),
      start_date: block.start_date,
      end_date: block.end_date,
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      block_number: '',
      start_date: '',
      end_date: '',
    });
  };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Leave Blocks Management</h3>
          <Button 
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : leaveBlocks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No leave blocks found
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Block Number</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Split</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveBlocks.map((block) => (
                      <TableRow key={block.id}>
                        <TableCell className="font-medium">Block {block.block_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(block.start_date), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(block.end_date), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {block.split_designation ? `Part ${block.split_designation}` : 'No'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => editBlock(block)}
                              disabled={!!block.split_designation}
                              title={block.split_designation ? "Split blocks cannot be edited" : "Edit block"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBlock(block.id, block.block_number)}
                              title="Delete block"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Add Block Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Leave Block</DialogTitle>
              <DialogDescription>
                Create a new leave block for staff annual leave periods
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="block_number" className="text-right">Block Number</label>
                <Input
                  id="block_number"
                  type="number"
                  min="1"
                  className="col-span-3"
                  value={formData.block_number}
                  onChange={(e) => setFormData({...formData, block_number: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="start_date" className="text-right">Start Date</label>
                <Input
                  id="start_date"
                  type="date"
                  className="col-span-3"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="end_date" className="text-right">End Date</label>
                <Input
                  id="end_date"
                  type="date"
                  className="col-span-3"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddBlock} disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Block'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Block Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Leave Block</DialogTitle>
              <DialogDescription>
                Update the details of this leave block
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit_block_number" className="text-right">Block Number</label>
                <Input
                  id="edit_block_number"
                  type="number"
                  min="1"
                  className="col-span-3"
                  value={formData.block_number}
                  onChange={(e) => setFormData({...formData, block_number: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit_start_date" className="text-right">Start Date</label>
                <Input
                  id="edit_start_date"
                  type="date"
                  className="col-span-3"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit_end_date" className="text-right">End Date</label>
                <Input
                  id="edit_end_date"
                  type="date"
                  className="col-span-3"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleEditBlock} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Block details dialog for user view
  const BlockDetailsDialog = () => {
    if (!currentBlock) return null;
    
    return (
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Block Details</DialogTitle>
            <DialogDescription>
              Information about your leave block
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm font-medium">Block Number:</span>
              <span className="col-span-2">{currentBlock.block_number}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm font-medium">Start Date:</span>
              <span className="col-span-2">{format(new Date(currentBlock.start_date), 'MMM d, yyyy')}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm font-medium">End Date:</span>
              <span className="col-span-2">{format(new Date(currentBlock.end_date), 'MMM d, yyyy')}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-sm font-medium">Duration:</span>
              <span className="col-span-2">
                {Math.ceil((new Date(currentBlock.end_date).getTime() - new Date(currentBlock.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
            
            {currentBlock.split_designation && (
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-sm font-medium">Split:</span>
                <span className="col-span-2">Part {currentBlock.split_designation}</span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-4">
      {isAdmin ? (
        // Admin view - existing functionality
        renderAdminLeaveBlocks()
      ) : (
        // Regular user view - new functionality
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Your Leave Blocks</h3>
          {renderUserLeaveBlocks()}
          <BlockDetailsDialog />
        </div>
      )}
    </div>
  );
};
