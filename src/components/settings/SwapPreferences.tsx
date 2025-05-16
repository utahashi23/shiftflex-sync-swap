
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useSwapPreferences } from '@/hooks/useSwapPreferences';

export const SwapPreferences = () => {
  const { user } = useAuth();
  const [expandedRegions, setExpandedRegions] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  
  const {
    regions,
    isLoading,
    isSaving,
    error,
    savePreferences,
    handleRegionToggle,
    handleAreaToggle,
    areAllAreasInRegionSelected,
    isAreaSelected,
    selectedRegions,
    setSelectedRegions,
    selectedAreas,
    setSelectedAreas
  } = useSwapPreferences();

  // Handle region checkbox changes
  const handleRegionCheckboxChange = (regionId: string, checked: boolean) => {
    // Toggle the region's expanded state
    if (checked) {
      // Expand the region when checked
      setExpandedRegions(prev => [...prev, regionId]);
    } else {
      // Collapse the region when unchecked
      setExpandedRegions(prev => prev.filter(id => id !== regionId));
    }
    
    // Update the selection state of the region and its areas
    handleRegionToggle(regionId, checked);
  };

  // Handle area checkbox changes
  const handleAreaCheckboxChange = (regionId: string, areaId: string, checked: boolean) => {
    // Update the area selection
    handleAreaToggle(regionId, areaId, checked);
    
    // If an area is checked, its region should be expanded
    if (checked && !expandedRegions.includes(regionId)) {
      setExpandedRegions(prev => [...prev, regionId]);
    }
    
    // Update the parent region's selection based on its areas
    const region = regions.find(r => r.id === regionId);
    if (region) {
      // If area is checked, add region to selectedRegions if not present
      if (checked && !selectedRegions.includes(regionId)) {
        setSelectedRegions(prev => [...prev, regionId]);
      }
      // If area is unchecked, check if any areas remain selected
      else if (!checked) {
        // If no other areas in this region are selected, remove region from selectedRegions
        const anyAreaSelected = region.areas.some(area => 
          area.id !== areaId && selectedAreas.includes(area.id)
        );
        if (!anyAreaSelected) {
          setSelectedRegions(prev => prev.filter(id => id !== regionId));
        }
      }
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to view swap preferences
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Swap Preferences</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
          >
            <Info className="h-4 w-4 mr-1" />
            Toggle Debug
          </Button>
        </CardTitle>
        <CardDescription>
          Select regions and areas you're willing to accept swaps from
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showDebug && (
          <Alert className="mb-4">
            <div className="text-xs font-mono overflow-auto max-h-40">
              <div>Regions count: {regions.length}</div>
              <div>Regions data: {JSON.stringify(regions.map(r => ({ id: r.id, name: r.name, areasCount: r.areas.length })), null, 2)}</div>
              <div className="mt-2">First region areas (if any): {regions[0] && JSON.stringify(regions[0].areas.slice(0, 2), null, 2)}</div>
              <div className="mt-2">Expanded regions: {JSON.stringify(expandedRegions)}</div>
              <div className="mt-2">Selected regions: {JSON.stringify(selectedRegions)}</div>
              <div className="mt-2">Selected areas: {JSON.stringify(selectedAreas)}</div>
            </div>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : regions.length === 0 ? (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No regions or areas are available. This may be due to RLS (Row Level Security) policies. Please ask your administrator to add regions and areas in the system settings or verify RLS policies allow access.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Accordion 
              type="multiple" 
              className="space-y-2"
              value={expandedRegions}
              onValueChange={setExpandedRegions}
            >
              {regions.map((region) => (
                <AccordionItem key={region.id} value={region.id} className="border rounded-md overflow-hidden">
                  <div className="flex items-center p-3">
                    <Checkbox 
                      id={`region-${region.id}`}
                      checked={areAllAreasInRegionSelected(region.id) || selectedRegions.includes(region.id)}
                      onCheckedChange={(checked) => handleRegionCheckboxChange(region.id, checked === true)}
                      className="mr-3"
                    />
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <label 
                        htmlFor={`region-${region.id}`} 
                        className="text-md font-medium cursor-pointer flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {region.name}
                      </label>
                    </AccordionTrigger>
                  </div>
                  
                  <AccordionContent className="px-3 pb-3">
                    {region.areas.length > 0 ? (
                      <div className="ml-8 grid gap-2">
                        {region.areas.map((area) => (
                          <div key={area.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`area-${area.id}`}
                              checked={isAreaSelected(area.id)}
                              onCheckedChange={(checked) => handleAreaCheckboxChange(region.id, area.id, checked === true)}
                            />
                            <label 
                              htmlFor={`area-${area.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {area.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ml-8 mt-2 text-sm text-gray-500 italic">
                        No areas available in this region
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <Button 
              className="w-full mt-4" 
              onClick={savePreferences}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
