
import { CalendarX } from "lucide-react";

interface EmptySwapStateProps {
  message: string;
  subtitle: string;
}

export const EmptySwapState = ({ message, subtitle }: EmptySwapStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
      <div className="p-3 bg-muted rounded-full mb-4">
        <CalendarX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg mb-1">{message}</h3>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
};
