
import { Sunrise, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Get color based on shift type (for the icon only)
  const getShiftTypeColor = (type: string) => {
    switch(type) {
      case 'day':
        return "text-yellow-600";
      case 'afternoon':
        return "text-orange-600";
      case 'night':
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const renderIcon = () => {
    const colorClass = getShiftTypeColor(type);
    
    switch(type) {
      case 'day':
        return <Sunrise className={`h-4 w-4 ${colorClass}`} />;
      case 'afternoon':
        return <Sun className={`h-4 w-4 ${colorClass}`} />;
      case 'night':
        return <Moon className={`h-4 w-4 ${colorClass}`} />;
      default:
        return <Sunrise className={`h-4 w-4 ${colorClass}`} />;
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1",
      className
    )}>
      {renderIcon()}
      {showLabel && <span className="text-sm">{getShiftTypeLabel(type)} Shift</span>}
    </div>
  );
};

export default ShiftIconBadge;
