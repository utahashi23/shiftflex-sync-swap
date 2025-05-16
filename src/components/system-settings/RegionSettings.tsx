
import { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, Trash, Plus, Upload } from 'lucide-react';
import { useRegions, Region } from '@/hooks/useRegions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CSVUploader } from "./CSVUploader";
import { SearchFilter } from "./SearchFilter";

export const RegionSettings = () => {
  const { regions, isLoading, isRefreshing, fetchRegions, addRegion, updateRegion, deleteRegion } = useRegions();
  const [newRegionName, setNewRegionName] = useState('');
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [editName, setEditName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const handleAddRegion = async () => {
    if (!newRegionName.trim()) return;
    await addRegion(newRegionName.trim());
    setNewRegionName('');
    setIsAddDialogOpen(false);
  };

  const handleUpdateRegion = async () => {
    if (!editingRegion || !editName.trim()) return;
    await updateRegion(editingRegion.id, editName.trim());
    setEditingRegion(null);
    setEditName('');
    setIsEditDialogOpen(false);
  };

  const handleDeleteRegion = async () => {
    if (!editingRegion) return;
    await deleteRegion(editingRegion.id);
    setEditingRegion(null);
    setIsDeleteDialogOpen(false);
  };

  const handleEditClick = (region: Region) => {
    setEditingRegion(region);
    setEditName(region.name);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (region: Region) => {
    setEditingRegion(region);
    setIsDeleteDialogOpen(true);
  };

  // Filter regions based on search term
  const filteredRegions = useMemo(() => {
    if (!searchFilter) return regions;
    return regions.filter(region => 
      region.name.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [regions, searchFilter]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Regions</CardTitle>
          <CardDescription>Manage the regions for truck assignments</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Regions from CSV</DialogTitle>
              </DialogHeader>
              <CSVUploader 
                entityType="regions"
                onSuccess={() => {
                  fetchRegions();
                  setIsImportDialogOpen(false);
                }}
                requiredColumns={["name"]}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Region
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Region</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input 
                  placeholder="Region Name" 
                  value={newRegionName} 
                  onChange={(e) => setNewRegionName(e.target.value)} 
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddRegion}>Add Region</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <SearchFilter 
            placeholder="Search regions..." 
            onFilterChange={setSearchFilter} 
          />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegions.length > 0 ? (
                  filteredRegions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell>{region.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditClick(region)} 
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteClick(region)} 
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      {searchFilter ? "No matching regions found." : "No regions found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Region</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input 
                placeholder="Region Name" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateRegion}>Update Region</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <p className="py-4">
              Are you sure you want to delete the region "{editingRegion?.name}"? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteRegion}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
