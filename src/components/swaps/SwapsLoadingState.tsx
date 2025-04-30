
import { Loader2 } from 'lucide-react';

const SwapsLoadingState = () => {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Loading your swap requests...</p>
      </div>
    </div>
  );
};

export default SwapsLoadingState;
