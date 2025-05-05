
import { useAuth } from '@/hooks/useAuth';
import { useShiftForm } from '@/hooks/useShiftForm';
import { ShiftDateField } from './shift-form/ShiftDateField';
import { TruckNameField } from './shift-form/TruckNameField';
import { ShiftOptionsFields } from './shift-form/ShiftOptionsFields';
import { TimeFields } from './shift-form/TimeFields';
import { ShiftTypeIndicator } from './shift-form/ShiftTypeIndicator';
import { FormActions } from './shift-form/FormActions';

// Types
interface ShiftFormProps {
  selectedDate: Date | null;
  selectedShift: any | null;
  setSelectedShift: (shift: any | null) => void;
  resetSelection: () => void;
}

const ShiftForm = ({ 
  selectedDate,
  selectedShift,
  setSelectedShift,
  resetSelection
}: ShiftFormProps) => {
  const { user } = useAuth();
  
  const {
    formTitle,
    isLoading,
    shiftDate,
    searchTerm,
    isTruckDropdownOpen,
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
    setSelectedShift,
    resetSelection,
    user
  });
  
  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-semibold mb-6">{formTitle}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
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
          onCancel={resetSelection}
          onDelete={handleDelete}
        />
      </form>
    </div>
  );
};

export default ShiftForm;
