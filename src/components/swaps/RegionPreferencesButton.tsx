
import { useState } from "react";
import { Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegionPreferencesDialog } from "./RegionPreferencesDialog";
import { useFormCustomization } from "@/hooks/useFormCustomization";

export const RegionPreferencesButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { settings, isLoading } = useFormCustomization();

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
        disabled={isLoading}
      >
        <MapIcon className="h-4 w-4" />
        {isLoading ? "Loading..." : settings.region_preferences_button_text}
      </Button>
      
      <RegionPreferencesDialog 
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
};
