
import React, { useState, useEffect } from 'react';
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface SwapFilters {
  sortDirection: 'asc' | 'desc';
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  truckName: string | null;
  shiftType: string | null;
}

interface SwapFiltersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SwapFilters;
  onApplyFilters: (filters: SwapFilters) => void;
  availableTrucks: string[];
}

export function SwapFiltersDialog({
  isOpen,
  onOpenChange,
  filters,
  onApplyFilters,
  availableTrucks,
}: SwapFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<SwapFilters>(filters);

  // Reset local filters when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  const handleApplyFilters = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleResetFilters = () => {
    const resetFilters: SwapFilters = {
      sortDirection: 'asc',
      dateRange: { from: undefined, to: undefined },
      truckName: null,
      shiftType: null,
    };
    setLocalFilters(resetFilters);
    onApplyFilters(resetFilters);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white" aria-describedby="filter-description">
        <DialogHeader>
          <DialogTitle>Swap Filters</DialogTitle>
          <DialogDescription id="filter-description">
            Customize how you view and sort shift swaps
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Sort Direction */}
          <div className="space-y-2">
            <Label>Sort by Date</Label>
            <RadioGroup
              value={localFilters.sortDirection}
              onValueChange={(value) => 
                setLocalFilters(prev => ({ ...prev, sortDirection: value as 'asc' | 'desc' }))
              }
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="asc" id="sort-asc" />
                <Label htmlFor="sort-asc">Oldest First</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="desc" id="sort-desc" />
                <Label htmlFor="sort-desc">Newest First</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !localFilters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {localFilters.dateRange.from ? (
                      format(localFilters.dateRange.from, "PP")
                    ) : (
                      <span>From date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={localFilters.dateRange.from}
                    onSelect={(date) =>
                      setLocalFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, from: date }
                      }))
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !localFilters.dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {localFilters.dateRange.to ? (
                      format(localFilters.dateRange.to, "PP")
                    ) : (
                      <span>To date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={localFilters.dateRange.to}
                    onSelect={(date) =>
                      setLocalFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, to: date }
                      }))
                    }
                    initialFocus
                    fromDate={localFilters.dateRange.from}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Truck Filter */}
          <div className="space-y-2">
            <Label>Truck Name</Label>
            <Select
              value={localFilters.truckName || "all-trucks"}
              onValueChange={(value) =>
                setLocalFilters(prev => ({
                  ...prev,
                  truckName: value === "all-trucks" ? null : value
                }))
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All trucks" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all-trucks">All trucks</SelectItem>
                {availableTrucks.map((truck) => (
                  <SelectItem key={truck} value={truck}>
                    {truck}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Shift Type Filter */}
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <Select
              value={localFilters.shiftType || "all-types"}
              onValueChange={(value) =>
                setLocalFilters(prev => ({
                  ...prev,
                  shiftType: value === "all-types" ? null : value
                }))
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All shift types" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all-types">All shift types</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleResetFilters}>
            Reset Filters
          </Button>
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
