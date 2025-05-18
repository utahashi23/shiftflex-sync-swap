import { useState, useEffect } from "react";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RegionAreaItem {
  id: string;
  name: string;
  areas?: RegionAreaItem[];
  selected?: boolean;
}

interface RegionPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export const RegionPreferencesDialog = ({
  open,
  onClose,
}: RegionPreferencesDialogProps) => {
  const [regions, setRegions] = useState<RegionAreaItem[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch regions, areas, and user preferences
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !open) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Fetching regions, areas, and preferences");
        
        // Fetch regions and areas
        const { data: regionsAndAreas, error: regionsError } = await supabase
          .rpc("get_all_regions_and_areas");
          
        if (regionsError) throw regionsError;
        
        // Transform the data structure
        const regionsDataMap = new Map(); // Using a regular JavaScript Map without type parameters
        
        // First pass: Create regions
        if (regionsAndAreas && Array.isArray(regionsAndAreas)) {
          regionsAndAreas.forEach((item: any) => {
            if (item.region_id && !regionsDataMap.has(item.region_id)) {
              regionsDataMap.set(item.region_id, {
                id: item.region_id,
                name: item.region_name,
                areas: []
              });
            }
          });
          
          // Second pass: Add areas to regions
          regionsAndAreas.forEach((item: any) => {
            if (item.area_id && item.region_id) {
              const region = regionsDataMap.get(item.region_id);
              if (region && region.areas) {
                region.areas.push({
                  id: item.area_id,
                  name: item.area_name || "Unnamed area"
                });
              }
            }
          });
        }
        
        const regionsArray = Array.from(regionsDataMap.values()) as RegionAreaItem[];
        
        // Fetch user preferences
        const { data: userPrefs, error: userPrefsError } = await supabase
          .rpc("get_user_swap_preferences", { p_user_id: user.id });
        
        if (userPrefsError) throw userPrefsError;
        
        const userRegions: string[] = [];
        const userAreas: string[] = [];
        
        if (userPrefs && Array.isArray(userPrefs)) {
          userPrefs.forEach((pref: any) => {
            if (pref.region_id) userRegions.push(pref.region_id);
            if (pref.area_id) userAreas.push(pref.area_id);
          });
        }
        
        setRegions(regionsArray);
        setSelectedRegions(userRegions);
        setSelectedAreas(userAreas);
        
        console.log("Loaded regions:", regionsArray.length);
        console.log("User preferences - regions:", userRegions.length, "areas:", userAreas.length);
        
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load preferences");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, open]);
  
  // Save preferences
  const savePreferences = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      console.log("Saving preferences for user:", user.id);
      console.log("Selected regions:", selectedRegions);
      console.log("Selected areas:", selectedAreas);
      
      // First delete existing preferences
      const { error: deleteError } = await supabase
        .from("user_swap_preferences")
        .delete()
        .eq("user_id", user.id);
        
      if (deleteError) throw deleteError;
      
      // Prepare new preferences to insert
      const preferencesToInsert = [];
      
      // Add region preferences
      for (const regionId of selectedRegions) {
        preferencesToInsert.push({
          user_id: user.id,
          region_id: regionId,
          area_id: null
        });
      }
      
      // Add area preferences
      for (const areaId of selectedAreas) {
        preferencesToInsert.push({
          user_id: user.id,
          region_id: null,
          area_id: areaId
        });
      }
      
      // Insert new preferences
      if (preferencesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("user_swap_preferences")
          .insert(preferencesToInsert);
          
        if (insertError) throw insertError;
      }
      
      toast({
        title: "Preferences saved",
        description: "Your region and area preferences have been updated."
      });
      
      onClose();
    } catch (err: any) {
      console.error("Error saving preferences:", err);
      setError(err.message || "Failed to save preferences");
      
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle region selection
  const handleRegionToggle = (regionId: string, checked: boolean) => {
    if (checked) {
      setSelectedRegions(prev => [...prev, regionId]);
      
      // Also select all areas in this region
      const region = regions.find(r => r.id === regionId);
      if (region && region.areas) {
        const areaIds = region.areas.map(area => area.id);
        setSelectedAreas(prev => [...prev, ...areaIds.filter(id => !prev.includes(id))]);
      }
    } else {
      setSelectedRegions(prev => prev.filter(id => id !== regionId));
      
      // Deselect all areas in this region
      const region = regions.find(r => r.id === regionId);
      if (region && region.areas) {
        const areaIds = region.areas.map(area => area.id);
        setSelectedAreas(prev => prev.filter(id => !areaIds.includes(id)));
      }
    }
  };
  
  // Handle area selection
  const handleAreaToggle = (regionId: string, areaId: string, checked: boolean) => {
    if (checked) {
      setSelectedAreas(prev => [...prev, areaId]);
      
      // Make sure the region is at least partially selected
      if (!selectedRegions.includes(regionId)) {
        setSelectedRegions(prev => [...prev, regionId]);
      }
    } else {
      setSelectedAreas(prev => prev.filter(id => id !== areaId));
      
      // Check if any areas remain selected in this region
      const region = regions.find(r => r.id === regionId);
      if (region && region.areas) {
        const otherAreasInRegion = region.areas
          .filter(area => area.id !== areaId)
          .map(area => area.id);
          
        // If no other areas are selected, deselect the region
        const hasSelectedAreas = otherAreasInRegion.some(id => 
          selectedAreas.filter(selectedId => selectedId !== areaId).includes(id)
        );
        
        if (!hasSelectedAreas) {
          setSelectedRegions(prev => prev.filter(id => id !== regionId));
        }
      }
    }
  };
  
  // Check if all areas in a region are selected
  const areAllAreasInRegionSelected = (regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    if (!region || !region.areas || region.areas.length === 0) return false;
    
    return region.areas.every(area => selectedAreas.includes(area.id));
  };
  
  // Check if an area is selected
  const isAreaSelected = (areaId: string) => {
    return selectedAreas.includes(areaId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-md">
        <DialogHeader>
          <DialogTitle>Region/Area Preferences</DialogTitle>
          <DialogDescription>
            Select regions and areas you prefer for shift swaps.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : regions.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No regions or areas are available. Please contact your administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {regions.map((region) => (
                <div key={region.id} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`region-${region.id}`}
                      checked={selectedRegions.includes(region.id) || areAllAreasInRegionSelected(region.id)}
                      onCheckedChange={(checked) => handleRegionToggle(region.id, checked === true)}
                    />
                    <Label 
                      htmlFor={`region-${region.id}`} 
                      className="text-md font-medium"
                    >
                      {region.name}
                    </Label>
                  </div>
                  
                  {region.areas && region.areas.length > 0 && (
                    <div className="ml-8 grid gap-2">
                      {region.areas.map((area) => (
                        <div key={area.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`area-${area.id}`}
                            checked={isAreaSelected(area.id)}
                            onCheckedChange={(checked) => handleAreaToggle(region.id, area.id, checked === true)}
                          />
                          <Label 
                            htmlFor={`area-${area.id}`}
                            className="text-sm"
                          >
                            {area.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={savePreferences} disabled={isLoading || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
