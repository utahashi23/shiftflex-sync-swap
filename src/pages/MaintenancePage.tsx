
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

const MaintenancePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use our existing hook to prevent navigation based on auth state
  useAuthRedirect();
  
  // Redirect any route back to maintenance page
  useEffect(() => {
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-xl mx-auto">
        {/* Logo */}
        <div className="mb-6">
          <div className="h-16 w-16 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-2xl mx-auto">
            SF
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            ShiftFlex
          </h1>
        </div>

        {/* Maintenance Message */}
        <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
          <div className="text-yellow-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">Application Temporarily Unavailable</h2>
          
          <p className="text-gray-700 mb-4">
            The app is currently down at the request of Ambulance Victoria.
          </p>
          
          <p className="text-gray-700 mb-4">
            We'll keep you in the loop. Stay tuned – application development is ongoing and updates are coming soon!
          </p>
        </div>
      </div>
      
      <footer className="mt-auto py-6">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} ShiftFlex. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default MaintenancePage;
