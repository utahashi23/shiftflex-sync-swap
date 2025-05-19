import { useState, useEffect } from "react";
import { ShiftSwapDialog } from "@/components/swaps/ShiftSwapDialog";
import { Button } from "@/components/ui/button";
import { format, isAfter, isEqual, isBefore } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { MultiSelect } from "@/components/swaps/MultiSelect";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ShiftIconBadge from "./ShiftIconBadge";
import { getShiftType } from "@/utils/shiftUtils";
import { SwapFilters } from "./SwapFiltersDialog";
import { useColleagueTypes } from "@/hooks/useColleagueTypes";

// Define shift types directly since we don't have a shift_types table
const SHIFT_TYPES = [
  { value: "day", label: "Day Shift" },
  { value: "afternoon", label: "Afternoon Shift" },
  { value: "night", label: "Night Shift" }
];

interface ImprovedSwapFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftIds: string[], wantedDates: string[], acceptedTypes: string[], requiredSkillset?: string[]) => Promise<boolean>;
  isDialog?: boolean;
  currentMonth?: Date;
  filters?: SwapFilters;
}

export const ImprovedSwapForm = ({
  isOpen,
  onClose,
  onSubmit,
  isDialog = true,
  currentMonth = new Date(),
  filters
}: ImprovedSwapFormProps) => {
  const [step, setStep] = useState(1);
  const [selectedShifts, setSelectedShifts] = useState<any[]>([]);
  const [userShifts, setUserShifts] = useState<any[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  const { user } = useAuth();
  const { colleagueTypes, isLoading: isLoadingColleagueTypes } = useColleagueTypes();
  
  // Format colleague types for MultiSelect component
  const colleagueTypeOptions = colleagueTypes.map(type => ({
    value: type.id,
    label: type.name
  }));
  
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
    setSelectedSkills([]);
    
  }, [user, isOpen]);
  
  // Filter shifts based on currentMonth and filters
  useEffect(() => {
    if (!userShifts.length) {
      setFilteredShifts([]);
      return;
    }
    
    // Get the first and last day of the selected month
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Format dates for comparison
    const startStr = startOfMonth.toISOString().split('T')[0];
    const endStr = endOfMonth.toISOString().split('T')[0];
    
    // First filter shifts that fall in the selected month
    let shiftsInMonth = userShifts.filter(shift => {
      const shiftDate = shift.date;
      return shiftDate >= startStr && shiftDate <= endStr;
    });
    
    // Apply additional filters if provided
    if (filters) {
      // Filter by date range
      if (filters.dateRange.from || filters.dateRange.to) {
        shiftsInMonth = shiftsInMonth.filter(shift => {
          const shiftDate = new Date(shift.date);
          
          if (filters.dateRange.from && filters.dateRange.to) {
            return (
              (isEqual(shiftDate, filters.dateRange.from) || isAfter(shiftDate, filters.dateRange.from)) &&
              (isEqual(shiftDate, filters.dateRange.to) || isBefore(shiftDate, filters.dateRange.to))
            );
          } else if (filters.dateRange.from) {
            return isEqual(shiftDate, filters.dateRange.from) || isAfter(shiftDate, filters.dateRange.from);
          } else if (filters.dateRange.to) {
            return isEqual(shiftDate, filters.dateRange.to) || isBefore(shiftDate, filters.dateRange.to);
          }
          
          return true;
        });
      }
      
      // Filter by truck name
      if (filters.truckName) {
        shiftsInMonth = shiftsInMonth.filter(shift => 
          shift.truck_name === filters.truckName
        );
      }
      
      // Filter by shift type
      if (filters.shiftType) {
        shiftsInMonth = shiftsInMonth.filter(shift => {
          const shiftType = getShiftType(shift.start_time);
          return shiftType === filters.shiftType;
        });
      }
    }
    
    console.log(`Filtered ${shiftsInMonth.length} shifts for month ${format(currentMonth, 'MMMM yyyy')}`);
    
    // Sort shifts by date
    shiftsInMonth.sort((a: any, b: any) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (filters?.sortDirection === 'desc') {
        return dateB.getTime() - dateA.getTime();
      }
      return dateA.getTime() - dateB.getTime();
    });
    
    setFilteredShifts(shiftsInMonth);
    
    // Clear selected shifts that are no longer in the filtered list
    setSelectedShifts(prevSelected => 
      prevSelected.filter(selected => 
        shiftsInMonth.some(shift => shift.id === selected.id)
      )
    );
  }, [userShifts, currentMonth, filters]);
  
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
      selectedTypes,
      selectedSkills.length > 0 ? selectedSkills : undefined
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
            ) : filteredShifts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  {userShifts.length === 0 
                    ? "No upcoming shifts found." 
                    : filters && (filters.dateRange.from || filters.dateRange.to || filters.truckName || filters.shiftType)
                      ? "No shifts match the current filters."
                      : `No shifts found for ${format(currentMonth, 'MMMM yyyy')}.`}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredShifts.map(shift => {
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
              <div className="border rounded-lg p-3">
                <CalendarComponent
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md pointer-events-auto"
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
      
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Required skillset (optional)</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Specify if your swap requires specific colleague types/skills
              </p>
              {isLoadingColleagueTypes ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <MultiSelect
                  options={colleagueTypeOptions}
                  selected={selectedSkills}
                  onChange={setSelectedSkills}
                  placeholder="Select required skillsets (optional)"
                />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                This field is optional. Leave empty if no specific skills are required.
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Get the total number of steps
  const totalSteps = 3;

  // Determine action button labels based on current step
  const getActionLabels = () => {
    if (step === 1) {
      return {
        next: "Continue",
        cancel: "Cancel"
      };
    } else if (step === totalSteps) {
      return {
        next: "Create Request",
        cancel: "Back"
      };
    } else {
      return {
        next: "Continue",
        cancel: "Back"
      };
    }
  };

  const actionLabels = getActionLabels();

  // Render the component based on isDialog prop
  if (isDialog) {
    return (
      <ShiftSwapDialog
        open={isOpen}
        onOpenChange={onClose}
        title={`Create Swap Request (${step}/${totalSteps})`}
        description={
          step === 1 ? "Select the shifts you want to swap" : 
          step === 2 ? "Select your date and shift preferences" :
          "Specify required skillset (optional)"
        }
        onConfirm={step === totalSteps ? handleSubmit : handleNextStep}
        onCancel={step === 1 ? undefined : handlePrevStep}
        confirmLabel={actionLabels.next}
        cancelLabel={actionLabels.cancel}
        isLoading={isSubmitting}
        preventAutoClose={true}
        confirmDisabled={
          (step === 1 && selectedShifts.length === 0) ||
          (step === 2 && (selectedDates.length === 0 || selectedTypes.length === 0))
        }
      >
        {renderContent()}
      </ShiftSwapDialog>
    );
  } else {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 ? "Select Shifts to Swap" : 
             step === 2 ? "Set Your Preferences" :
             "Required Skillset"}
          </CardTitle>
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
              <Button 
                onClick={step === totalSteps ? handleSubmit : handleNextStep} 
                disabled={(step === 1 && selectedShifts.length === 0) || 
                          (step === 2 && (selectedDates.length === 0 || selectedTypes.length === 0)) ||
                          isSubmitting}
              >
                {isSubmitting && <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {step === totalSteps ? "Create Request" : "Continue"}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    );
  }
};
