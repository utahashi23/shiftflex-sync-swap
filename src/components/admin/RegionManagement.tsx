
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

interface Region {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const RegionManagement = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [newRegionName, setNewRegionName] = useState('');

  // Fetch regions
  const { data: regions = [], isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data as Region[];
    },
  });

  // Add region mutation
  const addRegionMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('regions')
        .insert([{ name }])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({
        title: "Success",
        description: "Region added successfully",
      });
      setIsAddDialogOpen(false);
      setNewRegionName('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add region: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update region mutation
  const updateRegionMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('regions')
        .update({ name })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({
        title: "Success",
        description: "Region updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedRegion(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update region: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete region mutation
  const deleteRegionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({
        title: "Success",
        description: "Region deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedRegion(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete region: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddRegion = () => {
    if (!newRegionName.trim()) {
      toast({
        title: "Error",
        description: "Region name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    addRegionMutation.mutate(newRegionName);
  };

  const handleEditRegion = () => {
    if (!selectedRegion || !newRegionName.trim()) {
      toast({
        title: "Error",
        description: "Region name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateRegionMutation.mutate({
      id: selectedRegion.id,
      name: newRegionName,
    });
  };

  const handleDeleteRegion = () => {
    if (!selectedRegion) return;
    deleteRegionMutation.mutate(selectedRegion.id);
  };

  const openEditDialog = (region: Region) => {
    setSelectedRegion(region);
    setNewRegionName(region.name);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (region: Region) => {
    setSelectedRegion(region);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Regions Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Region
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading regions...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No regions found</TableCell>
                </TableRow>
              ) : (
                regions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell>{region.name}</TableCell>
                    <TableCell>{region.status}</TableCell>
                    <TableCell>{new Date(region.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(region)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(region)}>
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

      {/* Add Region Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Region</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Region name"
              value={newRegionName}
              onChange={(e) => setNewRegionName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRegion} disabled={addRegionMutation.isPending}>
              {addRegionMutation.isPending ? "Adding..." : "Add Region"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Region Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Region</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Region name"
              value={newRegionName}
              onChange={(e) => setNewRegionName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditRegion} disabled={updateRegionMutation.isPending}>
              {updateRegionMutation.isPending ? "Updating..." : "Update Region"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Region Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Region</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this region? This action will also delete all areas associated with this region.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRegion} className="bg-red-600 hover:bg-red-700">
              {deleteRegionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RegionManagement;
