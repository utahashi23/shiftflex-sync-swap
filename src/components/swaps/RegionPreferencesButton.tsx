
import { useState } from "react";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegionPreferencesDialog } from "./RegionPreferencesDialog";

export const RegionPreferencesButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Map className="h-4 w-4" />
        Region/Area Preferences
      </Button>
      
      <RegionPreferencesDialog 
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};
