
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  isLoading?: boolean;
}

const StatCard = ({ title, value, description, icon, isLoading = false }: StatCardProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold">{isLoading ? '...' : value}</h3>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="p-2 bg-secondary/50 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
