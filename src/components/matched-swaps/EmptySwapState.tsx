
import { Clock } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface EmptySwapStateProps {
  message: string;
  subtitle: string;
}

export const EmptySwapState = ({ message, subtitle }: EmptySwapStateProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-xl font-medium">{message}</h3>
        <p className="text-muted-foreground mt-2">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
};
