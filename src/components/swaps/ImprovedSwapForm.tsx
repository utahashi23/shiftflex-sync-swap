import { useState, useEffect } from "react";
import { ShiftSwapDialog } from "@/components/swaps/ShiftSwapDialog";
import { Button } from "@/components/ui/button";
import { format, isEqual, isAfter, isBefore } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { MultiSelect } from "@/components/swaps/MultiSelect";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Truck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ShiftIconBadge from "./ShiftIconBadge";
import { getShiftType } from "@/utils/shiftUtils";
import { SwapFilters } from "./SwapFiltersDialog";
import { useColleagueTypes } from "@/hooks/useColleagueTypes";
import { Label } from "@/components/ui/label";

// Define shift types directly since we don't have a shift_types table
const SHIFT_TYPES = [
  { value: "day", label: "Day Shift" },
  { value: "afternoon", label: "Afternoon Shift" },
  { value: "night", label: "Night Shift" }
];

interface ImprovedSwapFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftIds: string[], wantedDates: string[], acceptedTypes: string[], requiredSkillsets?: string[]) => Promise<boolean>;
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
  const [selectedSkillsets, setSelectedSkillsets] = useState<string[]>([]);
  
  const { user } = useAuth();
  const { colleagueTypes, isLoading: isLoadingColleagueTypes } = useColleagueTypes();
  
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
    setSelectedSkillsets([]);
    
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
      selectedSkillsets.length > 0 ? selectedSkillsets : undefined
    );
    
    setIsSubmitting(false);
    
    if (success && isDialog) {
      onClose();
    }
  };
  
  const toggleShift = (shift: any) => {
    const isSelected = selectedShifts.some(s => s.id === shift.id);
    
    if (isSelected) {
      setSelectedShifts(selectedShifts.filter(s => s.id !== shift.id));
    } else {
      setSelectedShifts([...selectedShifts, shift]);
    }
  };

  // Transform colleague types for MultiSelect
  const skillsetOptions = colleagueTypes.map(type => ({
    value: type.name,
    label: type.name
  }));

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">
              Select the shift(s) you want to swap
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
                  const shiftType = getShiftType(shift.start_time);
                  
                  return (
                    <div 
                      key={shift.id}
                      className={`border rounded-lg p-3 hover:bg-muted cursor-pointer flex justify-between items-center ${
                        isSelected ? 'bg-secondary border-primary' : ''
                      }`}
                      onClick={() => toggleShift(shift)}
                    >
                      <div>
                        <p className="font-medium">{format(new Date(shift.date), 'EEEE, MMM d, yyyy')}</p>
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
                <p className="text-sm font-medium mb-2">Selected shifts: {selectedShifts.length}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedShifts.map(shift => (
                    <Badge 
                      key={shift.id} 
                      variant="outline"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      {format(new Date(shift.date), 'MMM d')} ({shift.start_time} - {shift.end_time})
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleShift(shift);
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

            <Button 
              onClick={handleNextStep} 
              disabled={selectedDates.length === 0 || selectedTypes.length === 0}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-5 w-5" />
                <h3 className="text-lg font-medium">Required Skillset</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Select required skillsets for the person who will take your shift (optional)
              </p>
              
              {isLoadingColleagueTypes ? (
                <div className="h-10 w-full bg-gray-100 animate-pulse rounded"></div>
              ) : (
                <>
                  <Label htmlFor="skillsets" className="mb-2 block">Skillsets</Label>
                  <MultiSelect
                    options={skillsetOptions}
                    selected={selectedSkillsets}
                    onChange={setSelectedSkillsets}
                    placeholder="Select required skillsets (optional)"
                  />
                  {selectedSkillsets.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-1">Selected skillsets:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkillsets.map((skillset, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className="flex items-center gap-1 px-3 py-1"
                          >
                            {skillset}
                            <button 
                              type="button" 
                              onClick={() => {
                                setSelectedSkillsets(selectedSkillsets.filter((_, i) => i !== index));
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
                </>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Determine the current step title and description
  const getStepInfo = () => {
    switch (step) {
      case 1:
        return {
          title: "Create Swap Request",
          description: "Select the shifts you want to swap",
          confirmLabel: "Continue",
          cancelLabel: "Cancel"
        };
      case 2:
        return {
          title: "Select Preferences",
          description: "Choose your preferred dates and shift types",
          confirmLabel: "Continue",
          cancelLabel: "Back"
        };
      case 3:
        return {
          title: "Required Skillset",
          description: "Set required skillset for this swap (optional)",
          confirmLabel: "Create Request",
          cancelLabel: "Back"
        };
      default:
        return {
          title: "Create Swap Request",
          description: "",
          confirmLabel: "Next",
          cancelLabel: "Back"
        };
    }
  };

  const stepInfo = getStepInfo();
  const isLastStep = step === 3;

  // Render the component based on isDialog prop
  if (isDialog) {
    return (
      <ShiftSwapDialog
        open={isOpen}
        onOpenChange={onClose}
        title={stepInfo.title}
        description={stepInfo.description}
        onConfirm={step === 1 ? handleNextStep : (step === 2 ? handleNextStep : handleSubmit)}
        onCancel={step === 1 ? undefined : handlePrevStep}
        confirmLabel={stepInfo.confirmLabel}
        cancelLabel={stepInfo.cancelLabel}
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
          <CardTitle>{stepInfo.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step === 1 ? (
            <div className="w-full flex justify-end">
              <Button onClick={handleNextStep} disabled={selectedShifts.length === 0}>Continue</Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>
                {stepInfo.cancelLabel}
              </Button>
              <Button 
                onClick={isLastStep ? handleSubmit : handleNextStep} 
                disabled={(step === 2 && (selectedDates.length === 0 || selectedTypes.length === 0)) || isSubmitting}
              >
                {isSubmitting && <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {stepInfo.confirmLabel}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    );
  }
};
