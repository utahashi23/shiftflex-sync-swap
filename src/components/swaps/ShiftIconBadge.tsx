
import { Sunrise, Sun, Moon } from 'lucide-react';

interface ShiftIconBadgeProps {
  type: string;
  showLabel?: boolean;
  className?: string;
}

const ShiftIconBadge = ({ type, showLabel = false, className = "" }: ShiftIconBadgeProps) => {
  // Get shift type label
  const getShiftTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const renderIcon = () => {
    switch(type) {
      case 'day':
        return <Sunrise className="h-4 w-4" />;
      case 'afternoon':
        return <Sun className="h-4 w-4" />;
      case 'night':
        return <Moon className="h-4 w-4" />;
      default:
        return <Sunrise className="h-4 w-4" />;
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {renderIcon()}
      {showLabel && <span className="text-sm">{getShiftTypeLabel(type)} Shift</span>}
    </div>
  );
};

export default ShiftIconBadge;
