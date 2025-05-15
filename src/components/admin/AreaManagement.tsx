
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
}

interface Area {
  id: string;
  name: string;
  region_id: string;
  region_name?: string;
  status: string;
  created_at: string;
}

const AreaManagement = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newRegionId, setNewRegionId] = useState('');

  // Fetch regions
  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
        
      if (error) throw error;
      return data as Region[];
    },
  });

  // Set default region if available
  useEffect(() => {
    if (regions.length > 0 && !newRegionId) {
      setNewRegionId(regions[0].id);
    }
  }, [regions, newRegionId]);

  // Fetch areas with region names
  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select(`
          id, 
          name, 
          region_id, 
          status, 
          created_at,
          regions (name)
        `)
        .order('name');
        
      if (error) throw error;
      
      // Format the data to include region_name
      return data.map((area: any) => ({
        ...area,
        region_name: area.regions?.name
      }));
    },
  });

  // Add area mutation
  const addAreaMutation = useMutation({
    mutationFn: async ({ name, region_id }: { name: string; region_id: string }) => {
      const { data, error } = await supabase
        .from('areas')
        .insert([{ name, region_id }])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast({
        title: "Success",
        description: "Area added successfully",
      });
      setIsAddDialogOpen(false);
      setNewAreaName('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add area: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update area mutation
  const updateAreaMutation = useMutation({
    mutationFn: async ({ id, name, region_id }: { id: string; name: string; region_id: string }) => {
      const { data, error } = await supabase
        .from('areas')
        .update({ name, region_id })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast({
        title: "Success",
        description: "Area updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedArea(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update area: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete area mutation
  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast({
        title: "Success",
        description: "Area deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedArea(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete area: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddArea = () => {
    if (!newAreaName.trim() || !newRegionId) {
      toast({
        title: "Error",
        description: "Area name and region are required",
        variant: "destructive",
      });
      return;
    }

    addAreaMutation.mutate({
      name: newAreaName,
      region_id: newRegionId
    });
  };

  const handleEditArea = () => {
    if (!selectedArea || !newAreaName.trim() || !newRegionId) {
      toast({
        title: "Error",
        description: "Area name and region are required",
        variant: "destructive",
      });
      return;
    }

    updateAreaMutation.mutate({
      id: selectedArea.id,
      name: newAreaName,
      region_id: newRegionId
    });
  };

  const handleDeleteArea = () => {
    if (!selectedArea) return;
    deleteAreaMutation.mutate(selectedArea.id);
  };

  const openEditDialog = (area: Area) => {
    setSelectedArea(area);
    setNewAreaName(area.name);
    setNewRegionId(area.region_id);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (area: Area) => {
    setSelectedArea(area);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Areas Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Area
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading areas...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No areas found</TableCell>
                </TableRow>
              ) : (
                areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell>{area.name}</TableCell>
                    <TableCell>{area.region_name}</TableCell>
                    <TableCell>{area.status}</TableCell>
                    <TableCell>{new Date(area.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(area)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(area)}>
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

      {/* Add Area Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Area</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Input
                placeholder="Area name"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
              />
            </div>
            <div>
              <Select value={newRegionId} onValueChange={setNewRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddArea} disabled={addAreaMutation.isPending}>
              {addAreaMutation.isPending ? "Adding..." : "Add Area"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Area Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Area</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Input
                placeholder="Area name"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
              />
            </div>
            <div>
              <Select value={newRegionId} onValueChange={setNewRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditArea} disabled={updateAreaMutation.isPending}>
              {updateAreaMutation.isPending ? "Updating..." : "Update Area"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Area Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Area</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this area? This action will also update any trucks associated with this area.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteArea} className="bg-red-600 hover:bg-red-700">
              {deleteAreaMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AreaManagement;
