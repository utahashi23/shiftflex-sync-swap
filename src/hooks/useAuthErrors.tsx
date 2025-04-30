
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

type AuthErrorType = 'login' | 'signup' | 'reset' | 'update' | 'verification';

interface AuthErrorState {
  message: string;
  field?: 'email' | 'password' | 'organizationCode' | 'organization' | 'firstName' | 'lastName' | 'employeeId';
}

export const useAuthErrors = () => {
  const [errors, setErrors] = useState<AuthErrorState | null>(null);

  const handleAuthError = (
    error: any,
    type: AuthErrorType,
    showToast: boolean = true
  ) => {
    let message = 'An unknown error occurred.';
    let field: AuthErrorState['field'] | undefined;

    // Extract message from error object
    if (typeof error === 'string') {
      message = error;
    } else if (error?.message) {
      message = error.message;
    } else if (error?.error_description) {
      message = error.error_description;
    }

    // Determine field based on message content
    if (message.includes('email')) {
      field = 'email';
    } else if (message.includes('password')) {
      field = 'password';
    }

    // Store the error
    setErrors({ message, field });

    // Show toast if requested
    if (showToast) {
      let title = 'Authentication Error';
      
      switch (type) {
        case 'login':
          title = 'Login Failed';
          break;
        case 'signup':
          title = 'Signup Failed';
          break;
        case 'reset':
          title = 'Password Reset Failed';
          break;
        case 'update':
          title = 'Profile Update Failed';
          break;
        case 'verification':
          title = 'Verification Failed';
          break;
      }

      toast({
        title,
        description: message,
        variant: 'destructive',
      });
    }

    return { message, field };
  };

  const clearErrors = () => {
    setErrors(null);
  };

  // User-friendly error messages for common scenarios
  const getPasswordRequirements = () => {
    return 'Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters.';
  };

  const getFieldError = (field: AuthErrorState['field']) => {
    if (!errors) return null;
    return errors.field === field ? errors.message : null;
  };

  return {
    errors,
    handleAuthError,
    clearErrors,
    getPasswordRequirements,
    getFieldError,
  };
};
