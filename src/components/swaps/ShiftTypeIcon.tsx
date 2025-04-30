
import { Sunrise, Sun, Moon } from 'lucide-react';

interface ShiftTypeIconProps {
  type: string;
  className?: string;
}

const ShiftTypeIcon = ({ type, className = "h-4 w-4" }: ShiftTypeIconProps) => {
  switch(type) {
    case 'day':
      return <Sunrise className={className} />;
    case 'afternoon':
      return <Sun className={className} />;
    case 'night':
      return <Moon className={className} />;
    default:
      return null;
  }
};

export default ShiftTypeIcon;
