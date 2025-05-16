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
import { Loader2, Pencil, Trash, Plus, Upload } from 'lucide-react';
import { useColleagueTypes, ColleagueType } from '@/hooks/useColleagueTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CSVUploader } from "./CSVUploader";

export const ColleagueTypeSettings = () => {
  const { colleagueTypes, isLoading, isRefreshing, fetchColleagueTypes, addColleagueType, updateColleagueType, deleteColleagueType } = useColleagueTypes();
  const [newColleagueTypeName, setNewColleagueTypeName] = useState('');
  const [editingColleagueType, setEditingColleagueType] = useState<ColleagueType | null>(null);
  const [editName, setEditName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleAddColleagueType = async () => {
    if (!newColleagueTypeName.trim()) return;
    await addColleagueType(newColleagueTypeName.trim());
    setNewColleagueTypeName('');
    setIsAddDialogOpen(false);
  };

  const handleUpdateColleagueType = async () => {
    if (!editingColleagueType || !editName.trim()) return;
    await updateColleagueType(editingColleagueType.id, editName.trim());
    setEditingColleagueType(null);
    setEditName('');
    setIsEditDialogOpen(false);
  };

  const handleDeleteColleagueType = async () => {
    if (!editingColleagueType) return;
    await deleteColleagueType(editingColleagueType.id);
    setEditingColleagueType(null);
    setIsDeleteDialogOpen(false);
  };

  const handleEditClick = (colleagueType: ColleagueType) => {
    setEditingColleagueType(colleagueType);
    setEditName(colleagueType.name);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (colleagueType: ColleagueType) => {
    setEditingColleagueType(colleagueType);
    setIsDeleteDialogOpen(true);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Colleague Types</CardTitle>
          <CardDescription>Manage the colleague type options available in the system</CardDescription>
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
                <DialogTitle>Import Colleague Types from CSV</DialogTitle>
              </DialogHeader>
              <CSVUploader 
                entityType="colleague_types"
                onSuccess={() => {
                  fetchColleagueTypes();
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
                Add Colleague Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Colleague Type</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input 
                  placeholder="Colleague Type Name" 
                  value={newColleagueTypeName} 
                  onChange={(e) => setNewColleagueTypeName(e.target.value)} 
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddColleagueType}>Add Colleague Type</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
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
                {colleagueTypes.length > 0 ? (
                  colleagueTypes.map((colleagueType) => (
                    <TableRow key={colleagueType.id}>
                      <TableCell>{colleagueType.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditClick(colleagueType)} 
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteClick(colleagueType)} 
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
                      No colleague types found.
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
              <DialogTitle>Edit Colleague Type</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input 
                placeholder="Colleague Type Name" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateColleagueType}>Update Colleague Type</Button>
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
              Are you sure you want to delete the colleague type "{editingColleagueType?.name}"? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteColleagueType}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
