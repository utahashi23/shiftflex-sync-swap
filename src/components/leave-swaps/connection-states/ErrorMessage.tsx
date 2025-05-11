
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, isRetrying = false }) => {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4 mr-2" />
      <AlertTitle>Error loading matches</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
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

export default ErrorMessage;
