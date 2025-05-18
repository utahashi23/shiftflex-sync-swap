
import { Sunrise, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShiftTypeIconProps {
  type: string;
  className?: string;
}

export const ShiftTypeIcon = ({ type, className = "h-4 w-4" }: ShiftTypeIconProps) => {
  // Get color based on shift type
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

  const colorClass = getShiftTypeColor(type);
  
  switch(type) {
    case 'day':
      return <Sunrise className={cn(className, colorClass)} />;
    case 'afternoon':
      return <Sun className={cn(className, colorClass)} />;
    case 'night':
      return <Moon className={cn(className, colorClass)} />;
    default:
      return null;
  }
};
