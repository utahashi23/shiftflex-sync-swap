
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  debugInfo?: string;
}

const LoadingState = ({ 
  message = "Loading ShiftFlex...", 
  fullScreen = false,
  debugInfo
}: LoadingStateProps) => {
  // Log for debugging when component mounts
  useEffect(() => {
    console.log(`LoadingState rendered with message: ${message}`);
    if (debugInfo) console.log(`Debug info: ${debugInfo}`);
  }, [message, debugInfo]);

  const content = (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-primary/20 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
      <h1 className="text-2xl font-bold mb-4 text-gray-700">{message}</h1>
      {debugInfo && <p className="text-sm text-gray-500">{debugInfo}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {content}
      </div>
    );
  }

  return (
    <div className="py-12">
      {content}
    </div>
  );
};

export default LoadingState;
