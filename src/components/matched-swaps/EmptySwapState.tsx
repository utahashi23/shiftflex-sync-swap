
import { AlertCircle } from "lucide-react";

export interface EmptySwapStateProps {
  title: string;
  description: string;
}

export function EmptySwapState({ title, description }: EmptySwapStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <AlertCircle className="h-10 w-10 text-slate-400 mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
        {description}
      </p>
    </div>
  );
}
