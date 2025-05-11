
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff } from 'lucide-react';

interface ConnectionErrorProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

const ConnectionError: React.FC<ConnectionErrorProps> = ({ onRetry, isRetrying = false }) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <WifiOff className="h-4 w-4 mr-2" />
      <AlertTitle>Connection Error</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>Unable to connect to the server. This could be due to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Internet connection issues</li>
          <li>Server maintenance</li>
          <li>Temporary service disruption</li>
        </ul>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="mt-2"
          disabled={isRetrying}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default ConnectionError;
