
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

interface ColleagueType {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

const ColleagueTypeManagement = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedColleagueType, setSelectedColleagueType] = useState<ColleagueType | null>(null);
  const [newName, setNewName] = useState('');

  // Fetch colleague types
  const { data: colleagueTypes = [], isLoading } = useQuery({
    queryKey: ['colleagueTypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleague_types')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data as ColleagueType[];
    },
  });

  // Add colleague type mutation
  const addColleagueTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('colleague_types')
        .insert([{ name }])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleagueTypes'] });
      toast({
        title: "Success",
        description: "Colleague type added successfully",
      });
      setIsAddDialogOpen(false);
      setNewName('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add colleague type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update colleague type mutation
  const updateColleagueTypeMutation = useMutation({
    mutationFn: async ({ id, name, status }: { id: string; name: string; status: string }) => {
      const { data, error } = await supabase
        .from('colleague_types')
        .update({ name, status })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleagueTypes'] });
      toast({
        title: "Success",
        description: "Colleague type updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedColleagueType(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update colleague type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete colleague type mutation
  const deleteColleagueTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colleague_types')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleagueTypes'] });
      toast({
        title: "Success",
        description: "Colleague type deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedColleagueType(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete colleague type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'inactive' : 'active';
      const { data, error } = await supabase
        .from('colleague_types')
        .update({ status: newStatus })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleagueTypes'] });
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

  const handleAddColleagueType = () => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    addColleagueTypeMutation.mutate(newName);
  };

  const handleEditColleagueType = () => {
    if (!selectedColleagueType || !newName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateColleagueTypeMutation.mutate({
      id: selectedColleagueType.id,
      name: newName,
      status: selectedColleagueType.status
    });
  };

  const handleDeleteColleagueType = () => {
    if (!selectedColleagueType) return;
    deleteColleagueTypeMutation.mutate(selectedColleagueType.id);
  };

  const handleToggleStatus = (colleagueType: ColleagueType) => {
    toggleStatusMutation.mutate({
      id: colleagueType.id,
      status: colleagueType.status
    });
  };

  const openEditDialog = (colleagueType: ColleagueType) => {
    setSelectedColleagueType(colleagueType);
    setNewName(colleagueType.name);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (colleagueType: ColleagueType) => {
    setSelectedColleagueType(colleagueType);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Colleague Types Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Colleague Type
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading colleague types...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colleagueTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No colleague types found</TableCell>
                </TableRow>
              ) : (
                colleagueTypes.map((colleagueType) => (
                  <TableRow key={colleagueType.id}>
                    <TableCell>{colleagueType.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        colleagueType.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {colleagueType.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(colleagueType.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleStatus(colleagueType)}
                        >
                          {colleagueType.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(colleagueType)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(colleagueType)}>
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

      {/* Add Colleague Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Colleague Type</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Colleague type name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddColleagueType} disabled={addColleagueTypeMutation.isPending}>
              {addColleagueTypeMutation.isPending ? "Adding..." : "Add Colleague Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Colleague Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Colleague Type</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Colleague type name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditColleagueType} disabled={updateColleagueTypeMutation.isPending}>
              {updateColleagueTypeMutation.isPending ? "Updating..." : "Update Colleague Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Colleague Type Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Colleague Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this colleague type? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColleagueType} className="bg-red-600 hover:bg-red-700">
              {deleteColleagueTypeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ColleagueTypeManagement;
