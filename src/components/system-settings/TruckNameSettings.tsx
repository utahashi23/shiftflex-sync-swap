
import { useState, useEffect, useMemo } from 'react';
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
import { SafeSelect } from "@/components/ui/safe-select";
import { Loader2, Pencil, Trash, Plus, Upload, MapPin } from 'lucide-react';
import { useTruckNamesAdmin, TruckName } from '@/hooks/useTruckNamesAdmin';
import { useAreas } from '@/hooks/useAreas';
import { useRegions } from '@/hooks/useRegions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CSVUploader } from "./CSVUploader";
import { SearchFilter } from "./SearchFilter";
import { TruckDataImporter } from './TruckDataImporter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const TruckNameSettings = () => {
  const { truckNames, isLoading, isRefreshing, fetchTruckNames, addTruckName, updateTruckName, deleteTruckName } = useTruckNamesAdmin();
  const { regions } = useRegions();
  const { areas } = useAreas();
  
  const [newTruckName, setNewTruckName] = useState('');
  const [newTruckAddress, setNewTruckAddress] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [filteredAreas, setFilteredAreas] = useState(areas);
  
  const [editingTruck, setEditingTruck] = useState<TruckName | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAreaId, setEditAreaId] = useState<string>('');
  const [editRegionId, setEditRegionId] = useState<string>('');
  const [editFilteredAreas, setEditFilteredAreas] = useState(areas);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importTab, setImportTab] = useState<string>('basic');
  const [searchFilter, setSearchFilter] = useState('');

  // Filter areas based on selected region
  useEffect(() => {
    if (selectedRegionId) {
      setFilteredAreas(areas.filter(area => area.region_id === selectedRegionId));
      setSelectedAreaId(''); // Reset area selection when region changes
    } else {
      setFilteredAreas(areas);
    }
  }, [selectedRegionId, areas]);

  useEffect(() => {
    if (editRegionId) {
      setEditFilteredAreas(areas.filter(area => area.region_id === editRegionId));
      if (!areas.some(area => area.region_id === editRegionId && area.id === editAreaId)) {
        setEditAreaId('');
      }
    } else {
      setEditFilteredAreas(areas);
    }
  }, [editRegionId, areas, editAreaId]);

  const handleAddTruck = async () => {
    if (!newTruckName.trim()) return;
    await addTruckName(newTruckName.trim(), selectedAreaId || null, newTruckAddress.trim() || null);
    setNewTruckName('');
    setNewTruckAddress('');
    setSelectedAreaId('');
    setSelectedRegionId('');
    setIsAddDialogOpen(false);
  };

  const handleUpdateTruck = async () => {
    if (!editingTruck || !editName.trim()) return;
    await updateTruckName(editingTruck.id, editName.trim(), editAreaId || null, editAddress.trim() || null);
    setEditingTruck(null);
    setEditName('');
    setEditAddress('');
    setEditAreaId('');
    setEditRegionId('');
    setIsEditDialogOpen(false);
  };

  const handleDeleteTruck = async () => {
    if (!editingTruck) return;
    await deleteTruckName(editingTruck.id);
    setEditingTruck(null);
    setIsDeleteDialogOpen(false);
  };

  const handleEditClick = (truck: TruckName) => {
    setEditingTruck(truck);
    setEditName(truck.name);
    setEditAddress(truck.address || '');
    setEditAreaId(truck.area_id || '');
    if (truck.area) {
      setEditRegionId(truck.area.region_id);
    }
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (truck: TruckName) => {
    setEditingTruck(truck);
    setIsDeleteDialogOpen(true);
  };

  // Filter trucks based on search term
  const filteredTrucks = useMemo(() => {
    if (!searchFilter) return truckNames;
    const lowerFilter = searchFilter.toLowerCase();
    
    return truckNames.filter(truck => 
      truck.name.toLowerCase().includes(lowerFilter) ||
      (truck.address && truck.address.toLowerCase().includes(lowerFilter)) ||
      (truck.area?.name && truck.area.name.toLowerCase().includes(lowerFilter)) ||
      (truck.area?.region?.name && truck.area.region.name.toLowerCase().includes(lowerFilter))
    );
  }, [truckNames, searchFilter]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Truck Names</CardTitle>
          <CardDescription>Manage the truck names and their assigned areas</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Import Truck Data</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="basic" value={importTab} onValueChange={setImportTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="basic">Basic Import</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced Import</TabsTrigger>
                </TabsList>
                <TabsContent value="basic">
                  <CSVUploader 
                    entityType="truck_names"
                    onSuccess={() => {
                      fetchTruckNames();
                      setIsImportDialogOpen(false);
                    }}
                    requiredColumns={["name"]}
                    optionalColumns={["area_id", "address"]}
                    additionalInfo="The CSV must contain 'name' column. The 'area_id' and 'address' columns are optional."
                  />
                </TabsContent>
                <TabsContent value="advanced">
                  <TruckDataImporter 
                    onSuccess={() => {
                      fetchTruckNames();
                    }}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Truck Name
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Truck Name</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <Input 
                    placeholder="Truck Name" 
                    value={newTruckName} 
                    onChange={(e) => setNewTruckName(e.target.value)} 
                  />
                </div>
                <div>
                  <Input 
                    placeholder="Address" 
                    value={newTruckAddress} 
                    onChange={(e) => setNewTruckAddress(e.target.value)} 
                  />
                </div>
                <div>
                  <SafeSelect 
                    value={selectedRegionId} 
                    onValueChange={setSelectedRegionId}
                    options={[
                      { value: "", label: "None" },
                      ...regions.map(region => ({ value: region.id, label: region.name }))
                    ]}
                    placeholder="Select Region (Optional)"
                  />
                </div>
                {selectedRegionId && (
                  <div>
                    <SafeSelect 
                      value={selectedAreaId} 
                      onValueChange={setSelectedAreaId}
                      options={[
                        { value: "", label: "None" },
                        ...filteredAreas.map(area => ({ value: area.id, label: area.name }))
                      ]}
                      placeholder="Select Area (Optional)"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddTruck} disabled={!newTruckName.trim()}>Add Truck Name</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <SearchFilter 
            placeholder="Search truck names, areas, regions, or addresses..." 
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
                  <TableHead>Address</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrucks.length > 0 ? (
                  filteredTrucks.map((truck) => (
                    <TableRow key={truck.id}>
                      <TableCell>{truck.name}</TableCell>
                      <TableCell className="truncate max-w-[250px]">
                        {truck.address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-gray-500 mr-1" />
                            {truck.address}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">No address</span>
                        )}
                      </TableCell>
                      <TableCell>{truck.area?.name || 'Not Assigned'}</TableCell>
                      <TableCell>{truck.area?.region?.name || 'Not Assigned'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditClick(truck)} 
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteClick(truck)} 
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      {searchFilter ? "No matching truck names found." : "No truck names found."}
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
              <DialogTitle>Edit Truck Name</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Input 
                  placeholder="Truck Name" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                />
              </div>
              <div>
                <Input 
                  placeholder="Address" 
                  value={editAddress} 
                  onChange={(e) => setEditAddress(e.target.value)} 
                />
              </div>
              <div>
                <SafeSelect 
                  value={editRegionId} 
                  onValueChange={setEditRegionId}
                  options={[
                    { value: "", label: "None" },
                    ...regions.map(region => ({ value: region.id, label: region.name }))
                  ]}
                  placeholder="Select Region (Optional)"
                />
              </div>
              {editRegionId && (
                <div>
                  <SafeSelect 
                    value={editAreaId} 
                    onValueChange={setEditAreaId}
                    options={[
                      { value: "", label: "None" },
                      ...editFilteredAreas.map(area => ({ value: area.id, label: area.name }))
                    ]}
                    placeholder="Select Area (Optional)"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateTruck} disabled={!editName.trim()}>Update Truck Name</Button>
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
              Are you sure you want to delete the truck name "{editingTruck?.name}"? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteTruck}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
