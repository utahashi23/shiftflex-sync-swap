
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  UserRegistrationFormValues 
} from '@/components/auth/UserRegistrationForm';
import { 
  OrganizationFormValues 
} from '@/components/auth/OrganizationVerifier';

export function useRegistration() {
  const { checkOrganizationCode, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [organizationData, setOrganizationData] = useState<OrganizationFormValues | null>(null);

  const handleVerifyOrganization = (data: OrganizationFormValues) => {
    setOrganizationData(data);
    setCodeVerified(true);
  };

  const handleRegister = async (data: UserRegistrationFormValues) => {
    if (!codeVerified || !organizationData) {
      toast({
        title: "Organization Not Verified",
        description: "Please verify your organization code before registering.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { success, error } = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        employeeId: data.employeeId,
        organization: organizationData.organization,
      });

      if (!success) {
        throw new Error(error?.message || "Registration failed");
      }

      toast({
        title: "Registration Successful",
        description: "Please check your email to verify your account before logging in.",
      });
      
      // Reset verification state
      setCodeVerified(false);
      setOrganizationData(null);
      
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    codeVerified,
    checkOrganizationCode,
    handleVerifyOrganization,
    handleRegister
  };
}
