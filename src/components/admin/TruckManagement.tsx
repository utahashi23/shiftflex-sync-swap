
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

interface Area {
  id: string;
  name: string;
  region_id: string;
}

interface Truck {
  id: string;
  name: string;
  area_id: string | null;
  area_name?: string;
  region_name?: string;
  status: string;
  created_at: string;
}

const TruckManagement = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [newTruckName, setNewTruckName] = useState('');
  const [newAreaId, setNewAreaId] = useState<string | null>(null);

  // Fetch areas with region names
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select(`
          id, 
          name, 
          region_id,
          regions (name)
        `)
        .eq('status', 'active')
        .order('name');
        
      if (error) throw error;
      
      return data.map((area: any) => ({
        ...area,
        region_name: area.regions?.name,
        display_name: `${area.name} (${area.regions?.name})`
      }));
    },
  });

  // Fetch trucks with area and region names
  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('truck_names')
        .select(`
          id, 
          name, 
          area_id, 
          status, 
          created_at,
          areas (
            name,
            regions (
              name
            )
          )
        `)
        .order('name');
        
      if (error) throw error;
      
      // Format the data to include area_name and region_name
      return data.map((truck: any) => ({
        ...truck,
        area_name: truck.areas?.name,
        region_name: truck.areas?.regions?.name
      }));
    },
  });

  // Add truck mutation
  const addTruckMutation = useMutation({
    mutationFn: async ({ name, area_id }: { name: string; area_id: string | null }) => {
      const { data, error } = await supabase
        .from('truck_names')
        .insert([{ name, area_id }])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast({
        title: "Success",
        description: "Truck added successfully",
      });
      setIsAddDialogOpen(false);
      setNewTruckName('');
      setNewAreaId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add truck: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update truck mutation
  const updateTruckMutation = useMutation({
    mutationFn: async ({ id, name, area_id }: { id: string; name: string; area_id: string | null }) => {
      const { data, error } = await supabase
        .from('truck_names')
        .update({ name, area_id })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast({
        title: "Success",
        description: "Truck updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedTruck(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update truck: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete truck mutation
  const deleteTruckMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('truck_names')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast({
        title: "Success",
        description: "Truck deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedTruck(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete truck: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddTruck = () => {
    if (!newTruckName.trim()) {
      toast({
        title: "Error",
        description: "Truck name is required",
        variant: "destructive",
      });
      return;
    }

    addTruckMutation.mutate({
      name: newTruckName,
      area_id: newAreaId
    });
  };

  const handleEditTruck = () => {
    if (!selectedTruck || !newTruckName.trim()) {
      toast({
        title: "Error",
        description: "Truck name is required",
        variant: "destructive",
      });
      return;
    }

    updateTruckMutation.mutate({
      id: selectedTruck.id,
      name: newTruckName,
      area_id: newAreaId
    });
  };

  const handleDeleteTruck = () => {
    if (!selectedTruck) return;
    deleteTruckMutation.mutate(selectedTruck.id);
  };

  const openEditDialog = (truck: Truck) => {
    setSelectedTruck(truck);
    setNewTruckName(truck.name);
    setNewAreaId(truck.area_id);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (truck: Truck) => {
    setSelectedTruck(truck);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Trucks Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Truck
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading trucks...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No trucks found</TableCell>
                </TableRow>
              ) : (
                trucks.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell>{truck.name}</TableCell>
                    <TableCell>{truck.area_name || 'Not assigned'}</TableCell>
                    <TableCell>{truck.region_name || 'Not assigned'}</TableCell>
                    <TableCell>{truck.status}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(truck)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(truck)}>
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

      {/* Add Truck Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Truck</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Input
                placeholder="Truck name"
                value={newTruckName}
                onChange={(e) => setNewTruckName(e.target.value)}
              />
            </div>
            <div>
              <Select 
                value={newAreaId || ""} 
                onValueChange={(value) => setNewAreaId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an area (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {areas.map((area: any) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name} ({area.regions?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTruck} disabled={addTruckMutation.isPending}>
              {addTruckMutation.isPending ? "Adding..." : "Add Truck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Truck Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Truck</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Input
                placeholder="Truck name"
                value={newTruckName}
                onChange={(e) => setNewTruckName(e.target.value)}
              />
            </div>
            <div>
              <Select 
                value={newAreaId || ""} 
                onValueChange={(value) => setNewAreaId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an area (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {areas.map((area: any) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name} ({area.regions?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTruck} disabled={updateTruckMutation.isPending}>
              {updateTruckMutation.isPending ? "Updating..." : "Update Truck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Truck Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Truck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this truck? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTruck} className="bg-red-600 hover:bg-red-700">
              {deleteTruckMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TruckManagement;
