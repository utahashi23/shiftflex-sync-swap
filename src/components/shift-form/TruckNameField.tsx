
import { AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTruckNames } from '@/hooks/useTruckNames';

interface TruckNameFieldProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isTruckDropdownOpen: boolean;
  setIsTruckDropdownOpen: (isOpen: boolean) => void;
  onSelectTruck: (name: string) => void;
}

export const TruckNameField = ({ 
  searchTerm, 
  setSearchTerm, 
  isTruckDropdownOpen, 
  setIsTruckDropdownOpen, 
  onSelectTruck 
}: TruckNameFieldProps) => {
  const { truckNames, isLoading: isLoadingTrucks } = useTruckNames();
  
  // Filter truck names based on search term
  const filteredTruckNames = truckNames.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <Label htmlFor="truck-name-search">Truck Name</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <AlertCircle className="h-4 w-4 text-gray-400" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Enter the truck name or identifier</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {isLoadingTrucks ? (
        <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center">
          Loading truck names...
        </div>
      ) : (
        <div className="relative">
          <Input
            id="truck-name-search"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsTruckDropdownOpen(true);
            }}
            onFocus={() => setIsTruckDropdownOpen(true)}
            placeholder="Search for a truck name"
          />
          {isTruckDropdownOpen && searchTerm && (
            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-auto">
              {filteredTruckNames.length > 0 ? (
                filteredTruckNames.map((name, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onSelectTruck(name)}
                  >
                    {name}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500">No truck names found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
