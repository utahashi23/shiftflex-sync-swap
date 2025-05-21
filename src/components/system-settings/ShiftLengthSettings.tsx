
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShiftLength {
  id: string;
  hours: number;
  status: string;
}

export const ShiftLengthSettings = () => {
  const [shiftLengths, setShiftLengths] = useState<ShiftLength[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hours, setHours] = useState<number | ''>('');
  const [currentShiftLength, setCurrentShiftLength] = useState<ShiftLength | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchShiftLengths();
  }, []);

  const fetchShiftLengths = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('shift_lengths')
        .select('*')
        .order('hours', { ascending: true });

      if (error) throw error;
      setShiftLengths(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load shift lengths: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (hours === '') {
      toast({
        title: "Validation Error",
        description: "Please enter valid hours for the shift length.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (currentShiftLength) {
        // Update existing record
        const { error } = await supabase
          .from('shift_lengths')
          .update({ hours })
          .eq('id', currentShiftLength.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Shift length updated to ${hours} hours.`,
        });
      } else {
        // Create new record
        const { error } = await supabase
          .from('shift_lengths')
          .insert({ hours, status: 'active' });

        if (error) throw error;

        toast({
          title: "Success",
          description: `New ${hours}-hour shift length added.`,
        });
      }

      // Reset form and refresh data
      setHours('');
      setCurrentShiftLength(null);
      setIsFormDialogOpen(false);
      fetchShiftLengths();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save shift length: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!currentShiftLength) return;

    try {
      const { error } = await supabase
        .from('shift_lengths')
        .delete()
        .eq('id', currentShiftLength.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${currentShiftLength.hours}-hour shift length deleted.`,
      });

      setIsDeleteDialogOpen(false);
      setCurrentShiftLength(null);
      fetchShiftLengths();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete shift length: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (shiftLength: ShiftLength) => {
    setCurrentShiftLength(shiftLength);
    setHours(shiftLength.hours);
    setIsFormDialogOpen(true);
  };

  const handleAdd = () => {
    setCurrentShiftLength(null);
    setHours('');
    setIsFormDialogOpen(true);
  };

  const confirmDelete = (shiftLength: ShiftLength) => {
    setCurrentShiftLength(shiftLength);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Available Shift Lengths</h3>
        <Button onClick={handleAdd} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Add Shift Length
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading shift lengths...</div>
      ) : shiftLengths.length === 0 ? (
        <div className="text-center py-8 border rounded-md bg-muted/50">
          <p className="text-muted-foreground">No shift lengths configured yet</p>
          <Button variant="outline" onClick={handleAdd} className="mt-4">
            Add Your First Shift Length
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shiftLengths.map((shiftLength) => (
              <TableRow key={shiftLength.id}>
                <TableCell className="font-medium">{shiftLength.hours}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    shiftLength.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {shiftLength.status}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(shiftLength)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => confirmDelete(shiftLength)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentShiftLength ? 'Edit Shift Length' : 'Add Shift Length'}</DialogTitle>
            <DialogDescription>
              {currentShiftLength 
                ? 'Update the shift length value below.' 
                : 'Enter the number of hours for the new shift length.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="hours" className="text-sm font-medium">
                Hours
              </label>
              <Input
                id="hours"
                type="number"
                min="1"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="Enter number of hours"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdate}>
              {currentShiftLength ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shift Length</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the {currentShiftLength?.hours}-hour shift length?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
