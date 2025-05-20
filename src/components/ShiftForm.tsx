
import { useAuth } from '@/hooks/useAuth';
import { useShiftForm } from '@/hooks/useShiftForm';
import { ShiftDateField } from './shift-form/ShiftDateField';
import { TruckNameField } from './shift-form/TruckNameField';
import { ShiftOptionsFields } from './shift-form/ShiftOptionsFields';
import { TimeFields } from './shift-form/TimeFields';
import { ShiftTypeIndicator } from './shift-form/ShiftTypeIndicator';
import { FormActions } from './shift-form/FormActions';
import { Shift } from '@/hooks/useShiftData';
import { useEffect } from 'react';

// Types
interface ShiftFormProps {
  selectedDate: Date | null;
  selectedShift: Shift | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const ShiftForm = ({ 
  selectedDate,
  selectedShift,
  onCancel,
  onSuccess
}: ShiftFormProps) => {
  const { user } = useAuth();
  
  const {
    formTitle,
    isLoading,
    searchTerm,
    isTruckDropdownOpen,
    shiftDate,
    shiftStartTime,
    shiftEndTime,
    shiftType,
    colleagueType,
    shiftLength,
    isFormComplete,
    setSearchTerm,
    setIsTruckDropdownOpen,
    setShiftDate,
    setColleagueType,
    handleSubmit,
    handleDelete,
    handleStartTimeChange,
    handleShiftLengthChange,
    handleTruckSelection
  } = useShiftForm({
    selectedDate,
    selectedShift,
    setSelectedShift: () => {}, // We'll handle this through onSuccess now
    resetSelection: onCancel,
    user
  });
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Call the handleSubmit function and await its result
      const success = await handleSubmit(e);
      // Check if success is true before calling onSuccess
      if (success === true) {
        // Call the provided onSuccess callback to refresh data in both views
        onSuccess();
      }
    } catch (error) {
      console.error("Error in form submission:", error);
    }
  };
  
  // Log the values for debugging
  useEffect(() => {
    console.log("ShiftForm rendered with selectedShift:", selectedShift);
    console.log("Current form values:", { 
      searchTerm, shiftDate, shiftStartTime, 
      shiftEndTime, shiftType, colleagueType 
    });
  }, [selectedShift, searchTerm, shiftDate, shiftStartTime, 
      shiftEndTime, shiftType, colleagueType]);
  
  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-semibold mb-6">{selectedShift ? 'Edit Shift' : 'Add Shift to Calendar'}</h3>
      
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <ShiftDateField 
          value={shiftDate} 
          onChange={setShiftDate} 
        />
        
        <TruckNameField 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isTruckDropdownOpen={isTruckDropdownOpen}
          setIsTruckDropdownOpen={setIsTruckDropdownOpen}
          onSelectTruck={handleTruckSelection}
          isEditMode={!!selectedShift}
        />

        <ShiftOptionsFields
          shiftLength={shiftLength}
          onShiftLengthChange={handleShiftLengthChange}
          colleagueType={colleagueType}
          onColleagueTypeChange={setColleagueType}
        />
        
        <TimeFields
          startTime={shiftStartTime}
          endTime={shiftEndTime}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={(time) => handleStartTimeChange(time)} // We're reusing the handler
          isEndTimeDisabled={shiftLength !== 'custom'}
        />
        
        <ShiftTypeIndicator shiftType={shiftType} />
        
        <FormActions
          isEdit={!!selectedShift}
          isLoading={isLoading}
          isFormComplete={isFormComplete}
          onSave={() => {}} // Form will be submitted by the form's onSubmit handler
          onCancel={onCancel}
          onDelete={async () => {
            try {
              const success = await handleDelete();
              if (success === true) {
                onSuccess();
              }
            } catch (error) {
              console.error("Error deleting shift:", error);
            }
          }}
        />
      </form>
    </div>
  );
};

export default ShiftForm;
