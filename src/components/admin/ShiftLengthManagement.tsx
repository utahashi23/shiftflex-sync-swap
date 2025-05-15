
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ShiftLength {
  id: string;
  hours: number;
  status: string;
  created_at: string;
}

const ShiftLengthManagement = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedShiftLength, setSelectedShiftLength] = useState<ShiftLength | null>(null);
  const [newHours, setNewHours] = useState('');

  // Fetch shift lengths
  const { data: shiftLengths = [], isLoading } = useQuery({
    queryKey: ['shiftLengths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_lengths')
        .select('*')
        .order('hours');
        
      if (error) throw error;
      return data as ShiftLength[];
    },
  });

  // Add shift length mutation
  const addShiftLengthMutation = useMutation({
    mutationFn: async (hours: number) => {
      const { data, error } = await supabase
        .from('shift_lengths')
        .insert([{ hours }])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftLengths'] });
      toast({
        title: "Success",
        description: "Shift length added successfully",
      });
      setIsAddDialogOpen(false);
      setNewHours('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add shift length: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update shift length mutation
  const updateShiftLengthMutation = useMutation({
    mutationFn: async ({ id, hours, status }: { id: string; hours: number; status: string }) => {
      const { data, error } = await supabase
        .from('shift_lengths')
        .update({ hours, status })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftLengths'] });
      toast({
        title: "Success",
        description: "Shift length updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedShiftLength(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update shift length: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete shift length mutation
  const deleteShiftLengthMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_lengths')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftLengths'] });
      toast({
        title: "Success",
        description: "Shift length deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedShiftLength(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete shift length: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'inactive' : 'active';
      const { data, error } = await supabase
        .from('shift_lengths')
        .update({ status: newStatus })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftLengths'] });
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddShiftLength = () => {
    const hours = parseInt(newHours, 10);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    addShiftLengthMutation.mutate(hours);
  };

  const handleEditShiftLength = () => {
    if (!selectedShiftLength) return;
    
    const hours = parseInt(newHours, 10);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    updateShiftLengthMutation.mutate({
      id: selectedShiftLength.id,
      hours,
      status: selectedShiftLength.status
    });
  };

  const handleDeleteShiftLength = () => {
    if (!selectedShiftLength) return;
    deleteShiftLengthMutation.mutate(selectedShiftLength.id);
  };

  const handleToggleStatus = (shiftLength: ShiftLength) => {
    toggleStatusMutation.mutate({
      id: shiftLength.id,
      status: shiftLength.status
    });
  };

  const openEditDialog = (shiftLength: ShiftLength) => {
    setSelectedShiftLength(shiftLength);
    setNewHours(shiftLength.hours.toString());
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (shiftLength: ShiftLength) => {
    setSelectedShiftLength(shiftLength);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Shift Lengths Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Shift Length
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading shift lengths...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftLengths.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No shift lengths found</TableCell>
                </TableRow>
              ) : (
                shiftLengths.map((shiftLength) => (
                  <TableRow key={shiftLength.id}>
                    <TableCell>{shiftLength.hours} hours</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        shiftLength.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {shiftLength.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(shiftLength.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleStatus(shiftLength)}
                        >
                          {shiftLength.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(shiftLength)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(shiftLength)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Shift Length Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Shift Length</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              placeholder="Hours"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddShiftLength} disabled={addShiftLengthMutation.isPending}>
              {addShiftLengthMutation.isPending ? "Adding..." : "Add Shift Length"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Shift Length Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shift Length</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              placeholder="Hours"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditShiftLength} disabled={updateShiftLengthMutation.isPending}>
              {updateShiftLengthMutation.isPending ? "Updating..." : "Update Shift Length"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Shift Length Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift Length</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shift length? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShiftLength} className="bg-red-600 hover:bg-red-700">
              {deleteShiftLengthMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShiftLengthManagement;
