
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Truck, Map, Edit, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Types
export interface ShiftDetailsProps {
  shift: {
    id: number | string;
    date: string;
    title: string;
    startTime: string;
    endTime: string;
    type: 'day' | 'afternoon' | 'night';
    colleagueType: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
    location?: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onRequestSwap?: () => void;
  className?: string;
}

const ShiftDetails = ({ 
  shift, 
  onEdit, 
  onDelete, 
  onRequestSwap,
  className 
}: ShiftDetailsProps) => {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setDeleteDialogOpen(false);
    toast({
      title: "Shift Deleted",
      description: `Shift on ${new Date(shift.date).toLocaleDateString()} has been deleted.`,
    });
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Shift Details</CardTitle>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="icon" onClick={onEdit} title="Edit Shift">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="icon" onClick={() => setDeleteDialogOpen(true)} title="Delete Shift" className="text-destructive">
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-muted/30 rounded-md p-4">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-md">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <div className="text-xs text-muted-foreground">Vehicle</div>
                <div className="font-semibold text-lg">{shift.title}</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="p-2 bg-primary/10 rounded-md">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <div className="text-xs text-muted-foreground">Date</div>
              <div className="font-medium">{formatDate(shift.date)}</div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="p-2 bg-primary/10 rounded-md">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <div className="text-xs text-muted-foreground">Time</div>
              <div className="font-medium">{shift.startTime} - {shift.endTime}</div>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-muted-foreground">Shift Type</span>
              <div className="mt-1">
                <Badge variant="outline" className={cn(
                  "font-medium rounded-md",
                  shift.type === 'day' ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : 
                  shift.type === 'afternoon' ? "bg-orange-100 text-orange-800 hover:bg-orange-100" : 
                  "bg-blue-100 text-blue-800 hover:bg-blue-100"
                )}>
                  {shift.type.charAt(0).toUpperCase() + shift.type.slice(1)} Shift
                </Badge>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Colleague Type</span>
              <div className="mt-1">
                <Badge variant="outline" className="font-medium">
                  {shift.colleagueType}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        {shift.location && (
          <div className="flex items-center pt-2 border-t">
            <Map className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-sm">{shift.location}</span>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm">Colleague assignment</span>
            </div>
            <Badge variant="outline">Assigned</Badge>
          </div>
        </div>
        
        {onRequestSwap && (
          <Button 
            onClick={onRequestSwap} 
            className="w-full mt-4"
          >
            Request Shift Swap
          </Button>
        )}
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shift</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this shift? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted/40 p-4 rounded-md my-4">
            <div className="text-sm">
              <div><strong>Date:</strong> {formatDate(shift.date)}</div>
              <div><strong>Time:</strong> {shift.startTime} - {shift.endTime}</div>
              <div><strong>Vehicle:</strong> {shift.title}</div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ShiftDetails;
