
import { Link } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { OrganizationVerifier } from '@/components/auth/OrganizationVerifier';
import { UserRegistrationForm } from '@/components/auth/UserRegistrationForm';
import { useRegistration } from '@/hooks/useRegistration';

const Register = () => {
  useAuthRedirect({ authRoutes: true });
  
  const {
    isLoading,
    codeVerified,
    checkOrganizationCode,
    handleVerifyOrganization,
    handleRegister
  } = useRegistration();

  return (
    <AuthLayout title="Create Your Account">
      {!codeVerified ? (
        <OrganizationVerifier 
          onVerified={handleVerifyOrganization}
          isLoading={isLoading}
          checkOrganizationCode={checkOrganizationCode}
        />
      ) : (
        <UserRegistrationForm 
          onSubmit={handleRegister}
          isLoading={isLoading}
        />
      )}
      
      {!codeVerified && (
        <div className="text-center mt-6 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </div>
      )}
    </AuthLayout>
  );
};

export default Register;
