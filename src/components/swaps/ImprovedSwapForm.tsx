
import { useState, useEffect } from "react";
import { ShiftSwapDialog } from "@/components/swaps/ShiftSwapDialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { MultiSelect } from "@/components/swaps/MultiSelect";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Define shift types directly since we don't have a shift_types table
const SHIFT_TYPES = [
  { value: "day", label: "Day Shift" },
  { value: "afternoon", label: "Afternoon Shift" },
  { value: "night", label: "Night Shift" }
];

interface ImprovedSwapFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string, wantedDates: string[], acceptedTypes: string[]) => Promise<boolean>;
  isDialog?: boolean;
}

export const ImprovedSwapForm = ({
  isOpen,
  onClose,
  onSubmit,
  isDialog = true
}: ImprovedSwapFormProps) => {
  const [step, setStep] = useState(1);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [userShifts, setUserShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  const { user } = useAuth();
  
  // Fetch user shifts
  useEffect(() => {
    const fetchUserShifts = async () => {
      if (!user || !isOpen) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', new Date().toISOString().split('T')[0]);
          
        if (error) throw error;
        
        setUserShifts(data || []);
      } catch (err) {
        console.error('Error fetching shifts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserShifts();
    
    // Reset form when opened
    setStep(1);
    setSelectedShift(null);
    setSelectedDates([]);
    setSelectedTypes([]);
    
  }, [user, isOpen]);
  
  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };
  
  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };
  
  const handleSubmit = async () => {
    if (!selectedShift) return;
    
    setIsSubmitting(true);
    
    // Format dates
    const formattedDates = selectedDates.map(date => 
      format(date, 'yyyy-MM-dd')
    );
    
    // Submit the form
    const success = await onSubmit(
      selectedShift.id,
      formattedDates,
      selectedTypes
    );
    
    setIsSubmitting(false);
    
    if (success && isDialog) {
      onClose();
    }
  };
  
  const handleSelectShift = (shift: any) => {
    setSelectedShift(shift);
    handleNextStep();
  };

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select a shift to swap</h3>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : userShifts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No upcoming shifts found.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {userShifts.map(shift => (
                  <div 
                    key={shift.id}
                    className="border rounded-lg p-3 hover:bg-muted cursor-pointer flex justify-between items-center"
                    onClick={() => handleSelectShift(shift)}
                  >
                    <div>
                      <p className="font-medium">{format(new Date(shift.date), 'EEEE, MMM d, yyyy')}</p>
                      <p className="text-sm text-muted-foreground">
                        {shift.start_time} - {shift.end_time}
                      </p>
                    </div>
                    <div className="text-sm px-2 py-1 bg-primary/10 rounded">
                      {shift.shift_type || "Unknown Shift"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Select preferred dates</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose dates when you would like to work instead
              </p>
              <div className="border rounded-lg p-3">
                <CalendarComponent
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md"
                  disabled={(date) => {
                    // Disable dates before today
                    return date < new Date(new Date().setHours(0, 0, 0, 0));
                  }}
                />
              </div>
              
              {selectedDates.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Selected dates:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((date, index) => (
                      <div 
                        key={index} 
                        className="text-xs px-2 py-1 bg-primary/10 rounded-full flex items-center gap-1"
                      >
                        {format(date, 'MMM d, yyyy')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Select acceptable shift types</h3>
              <MultiSelect
                options={SHIFT_TYPES}
                selected={selectedTypes}
                onChange={setSelectedTypes}
                placeholder="Select shift types"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render the component based on isDialog prop
  if (isDialog) {
    return (
      <ShiftSwapDialog
        open={isOpen}
        onOpenChange={onClose}
        title="Create Swap Request"
        description={step === 1 ? "Select the shift you want to swap" : "Select your preferences"}
        onConfirm={step === 1 ? () => {} : handleSubmit}
        onCancel={step === 1 ? undefined : handlePrevStep}
        confirmLabel={step === 1 ? "Select" : "Create Request"}
        cancelLabel={step === 1 ? "Cancel" : "Back"}
        isLoading={isSubmitting}
        preventAutoClose={true}
      >
        {renderContent()}
      </ShiftSwapDialog>
    );
  } else {
    // Render inline version for tabs
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step === 1 ? "Select Shift to Swap" : "Set Your Preferences"}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step === 1 ? (
            <div className="w-full flex justify-end">
              {/* No back button on first step when inline */}
            </div>
          ) : (
            <Button variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>
              Back
            </Button>
          )}
          
          {step === 2 && (
            <Button onClick={handleSubmit} disabled={selectedDates.length === 0 || selectedTypes.length === 0 || isSubmitting}>
              {isSubmitting && <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              Create Request
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
};
