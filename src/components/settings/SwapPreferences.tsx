
import { useState } from 'react';
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
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [showDebug, setShowDebug] = useState(false);
  
  const {
    regions,
    isLoading,
    isSaving,
    error,
    savePreferences,
    handleRegionToggle,
    handleAreaToggle,
    areAllAreasInRegionSelected,
    isAreaSelected
  } = useSwapPreferences();

  // Handle accordion state changes
  const handleAccordionChange = (value: string) => {
    setOpenAccordion(value === openAccordion ? undefined : value);
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
            <div className="text-xs font-mono">
              <div>Regions count: {regions.length}</div>
              <div>Regions data: {JSON.stringify(regions.map(r => ({ id: r.id, name: r.name })), null, 2)}</div>
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
              No regions or areas are available. Please ask your administrator to add regions and areas in the system settings.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Accordion 
              type="single" 
              collapsible 
              className="space-y-2" 
              value={openAccordion}
              onValueChange={handleAccordionChange}
            >
              {regions.map((region) => (
                <AccordionItem key={region.id} value={region.id} className="border rounded-md overflow-hidden">
                  <div className="flex items-center p-3">
                    <Checkbox 
                      id={`region-${region.id}`}
                      checked={areAllAreasInRegionSelected(region.id)}
                      onCheckedChange={(checked) => handleRegionToggle(region.id, checked === true)}
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
                              onCheckedChange={(checked) => handleAreaToggle(region.id, area.id, checked === true)}
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
