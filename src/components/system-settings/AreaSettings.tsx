
import { useState } from 'react';
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Trash, Plus, Upload } from 'lucide-react';
import { useAreas, Area } from '@/hooks/useAreas';
import { useRegions } from '@/hooks/useRegions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CSVUploader } from "./CSVUploader";

export const AreaSettings = () => {
  const { areas, isLoading, isRefreshing, fetchAreas, addArea, updateArea, deleteArea } = useAreas();
  const { regions, isLoading: isLoadingRegions } = useRegions();
  
  const [newAreaName, setNewAreaName] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegionId, setEditRegionId] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleAddArea = async () => {
    if (!newAreaName.trim() || !selectedRegionId) return;
    await addArea(newAreaName.trim(), selectedRegionId);
    setNewAreaName('');
    setSelectedRegionId('');
    setIsAddDialogOpen(false);
  };

  const handleUpdateArea = async () => {
    if (!editingArea || !editName.trim() || !editRegionId) return;
    await updateArea(editingArea.id, editName.trim(), editRegionId);
    setEditingArea(null);
    setEditName('');
    setEditRegionId('');
    setIsEditDialogOpen(false);
  };

  const handleDeleteArea = async () => {
    if (!editingArea) return;
    await deleteArea(editingArea.id);
    setEditingArea(null);
    setIsDeleteDialogOpen(false);
  };

  const handleEditClick = (area: Area) => {
    setEditingArea(area);
    setEditName(area.name);
    setEditRegionId(area.region_id);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (area: Area) => {
    setEditingArea(area);
    setIsDeleteDialogOpen(true);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Areas</CardTitle>
          <CardDescription>Manage the areas within regions for truck assignments</CardDescription>
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
                <DialogTitle>Import Areas from CSV</DialogTitle>
              </DialogHeader>
              <CSVUploader 
                entityType="areas"
                onSuccess={() => {
                  fetchAreas();
                  setIsImportDialogOpen(false);
                }}
                requiredColumns={["name", "region_id"]}
                additionalInfo="The CSV must contain 'name' and 'region_id' columns. The region_id should match existing region IDs."
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Area
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Area</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <Input 
                    placeholder="Area Name" 
                    value={newAreaName} 
                    onChange={(e) => setNewAreaName(e.target.value)} 
                  />
                </div>
                <div>
                  <Select 
                    value={selectedRegionId} 
                    onValueChange={setSelectedRegionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Region" />
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
                <Button onClick={handleAddArea} disabled={!newAreaName.trim() || !selectedRegionId}>Add Area</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isLoadingRegions ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.length > 0 ? (
                  areas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell>{area.name}</TableCell>
                      <TableCell>{area.region?.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditClick(area)} 
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteClick(area)} 
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
                    <TableCell colSpan={3} className="h-24 text-center">
                      No areas found.
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
              <DialogTitle>Edit Area</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Input 
                  placeholder="Area Name" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                />
              </div>
              <div>
                <Select 
                  value={editRegionId} 
                  onValueChange={setEditRegionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Region" />
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
              <Button onClick={handleUpdateArea} disabled={!editName.trim() || !editRegionId}>Update Area</Button>
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
              Are you sure you want to delete the area "{editingArea?.name}"? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteArea}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
