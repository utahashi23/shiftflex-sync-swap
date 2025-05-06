
import { cn } from '@/lib/utils';
import ShiftTypeIcon from './ShiftTypeIcon';

interface ShiftTypeBadgeProps {
  type: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  small?: boolean; // Adding the small prop to the interface as an alias for backward compatibility
}

const ShiftTypeBadge = ({ 
  type, 
  showLabel = true, 
  size = 'md',
  small = false // Add small prop with default value
}: ShiftTypeBadgeProps) => {
  // If small is true, override size to be 'sm'
  const finalSize = small ? 'sm' : size;
  
  // Get shift type label
  const getShiftTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className={cn(
      "inline-flex items-center rounded-full text-xs font-medium",
      finalSize === 'sm' ? "px-2 py-0.5" : "px-3 py-1",
      type === 'day' ? "bg-yellow-100 text-yellow-800" : 
      type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
      "bg-blue-100 text-blue-800"
    )}>
      <ShiftTypeIcon type={type} />
      {showLabel && <span className="ml-1">{getShiftTypeLabel(type)} Shift</span>}
    </div>
  );
};

export default ShiftTypeBadge;
