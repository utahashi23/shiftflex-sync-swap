import { useState, useEffect } from "react";
import { ShiftSwapDialog } from "@/components/swaps/ShiftSwapDialog";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { MultiSelect } from "@/components/swaps/MultiSelect";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Truck, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ShiftIconBadge from "./ShiftIconBadge";
import { getShiftType } from "@/utils/shiftUtils";

// Define shift types directly since we don't have a shift_types table
const SHIFT_TYPES = [
  { value: "day", label: "Day Shift" },
  { value: "afternoon", label: "Afternoon Shift" },
  { value: "night", label: "Night Shift" }
];

interface ImprovedSwapFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftIds: string[], wantedDates: string[], acceptedTypes: string[]) => Promise<boolean>;
  isDialog?: boolean;
  currentDate?: Date;
}

export const ImprovedSwapForm = ({
  isOpen,
  onClose,
  onSubmit,
  isDialog = true,
  currentDate = new Date()
}: ImprovedSwapFormProps) => {
  const [step, setStep] = useState(1);
  const [selectedShifts, setSelectedShifts] = useState<any[]>([]);
  const [userShifts, setUserShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(currentDate);
  
  const { user } = useAuth();
  
  // Update internal calendar month when prop changes
  useEffect(() => {
    if (currentDate) {
      setCalendarCurrentMonth(currentDate);
    }
  }, [currentDate]);
  
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
    setSelectedShifts([]);
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
    if (selectedShifts.length === 0) return;
    
    setIsSubmitting(true);
    
    // Format dates
    const formattedDates = selectedDates.map(date => 
      format(date, 'yyyy-MM-dd')
    );
    
    // Get shift IDs
    const shiftIds = selectedShifts.map(shift => shift.id);
    
    // Submit the form
    const success = await onSubmit(
      shiftIds,
      formattedDates,
      selectedTypes
    );
    
    setIsSubmitting(false);
    
    if (success && isDialog) {
      onClose();
    }
  };
  
  const toggleShiftSelection = (shift: any) => {
    // Check if shift is already selected
    const isSelected = selectedShifts.some(s => s.id === shift.id);
    
    if (isSelected) {
      // Remove from selection
      setSelectedShifts(selectedShifts.filter(s => s.id !== shift.id));
    } else {
      // Add to selection
      setSelectedShifts([...selectedShifts, shift]);
    }
  };
  
  const handleContinue = () => {
    if (selectedShifts.length > 0) {
      handleNextStep();
    }
  };

  // Methods for month navigation - these will be controlled by parent in non-dialog mode
  const handlePrevMonth = () => {
    if (!isDialog) return; // Don't handle navigation in non-dialog mode
    setCalendarCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    if (!isDialog) return; // Don't handle navigation in non-dialog mode
    setCalendarCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">
              You can select multiple shifts that you want to swap
            </p>
            
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
                {userShifts.map(shift => {
                  const isSelected = selectedShifts.some(s => s.id === shift.id);
                  
                  // Determine shift type
                  const shiftType = getShiftType(shift.start_time);
                  
                  return (
                    <div 
                      key={shift.id}
                      className={`border rounded-lg p-3 hover:bg-muted cursor-pointer flex justify-between items-center ${
                        isSelected ? 'bg-secondary border-primary' : ''
                      }`}
                      onClick={() => toggleShiftSelection(shift)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{format(new Date(shift.date), 'EEEE, MMM d, yyyy')}</p>
                            <ShiftIconBadge type={shiftType} />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {shift.start_time} - {shift.end_time}
                        </p>
                        {shift.truck_name && (
                          <div className="flex items-center mt-1 text-xs text-muted-foreground">
                            <Truck className="h-3 w-3 mr-1" />
                            <span>{shift.truck_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <Checkbox checked={isSelected} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {selectedShifts.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected shifts ({selectedShifts.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedShifts.map((shift, index) => (
                    <Badge 
                      key={index} 
                      variant="outline"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      {format(new Date(shift.date), 'MMM d')} 
                      <ShiftIconBadge type={getShiftType(shift.start_time)} className="mx-1" />
                      {shift.truck_name && <span>({shift.truck_name})</span>}
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleShiftSelection(shift);
                        }}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
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
              
              {/* Month navigation */}
              <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous Month
                </Button>
                <h2 className="text-lg font-medium">
                  {format(calendarCurrentMonth, 'MMMM yyyy')}
                </h2>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  Next Month
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              
              <div className="border rounded-lg p-3">
                <CalendarComponent
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md"
                  month={calendarCurrentMonth}
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
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {format(date, 'MMM d, yyyy')}
                        <button 
                          type="button" 
                          onClick={() => {
                            setSelectedDates(selectedDates.filter((_, i) => i !== index));
                          }}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Select acceptable shift types</h3>
              <p className="text-sm text-muted-foreground mb-2">You can select multiple shift types that you're willing to accept</p>
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
        description={step === 1 ? "Select the shifts you want to swap" : "Select your preferences"}
        onConfirm={step === 1 ? handleContinue : handleSubmit}
        onCancel={step === 1 ? undefined : handlePrevStep}
        confirmLabel={step === 1 ? "Continue" : "Create Request"}
        cancelLabel={step === 1 ? "Cancel" : "Back"}
        isLoading={isSubmitting}
        preventAutoClose={true}
      >
        {renderContent()}
      </ShiftSwapDialog>
    );
  } else {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{step === 1 ? "Select Shifts to Swap" : "Set Your Preferences"}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step === 1 ? (
            <div className="w-full flex justify-end">
              <Button onClick={handleContinue} disabled={selectedShifts.length === 0}>Continue</Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={selectedDates.length === 0 || selectedTypes.length === 0 || isSubmitting}>
                {isSubmitting && <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                Create Request
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    );
  }
};
