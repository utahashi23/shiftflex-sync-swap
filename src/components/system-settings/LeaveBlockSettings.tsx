
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
import { Calendar, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { LeaveBlock } from '@/types/leave-blocks';

export const LeaveBlockSettings = () => {
  const [leaveBlocks, setLeaveBlocks] = useState<LeaveBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
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
      
      setFormData({
        block_number: '',
        start_date: '',
        end_date: '',
      });
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

  const handleDeleteBlock = async (id: string, blockNumber: number) => {
    if (confirm(`Are you sure you want to delete leave block ${blockNumber}?`)) {
      try {
        setIsLoading(true);
        
        // Get assigned users first
        const { data: assignments } = await supabase
          .from('user_leave_blocks')
          .select('id')
          .eq('leave_block_id', id);
        
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Leave Blocks</h3>
        <Button 
          onClick={() => setShowAddDialog(true)}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block Number</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Split</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBlock(block.id, block.block_number)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
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
    </div>
  );
};
