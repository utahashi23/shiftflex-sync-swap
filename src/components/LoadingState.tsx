
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  debugInfo?: string;
  showForceLogout?: boolean;
  timeoutInMs?: number;
}

const LoadingState = ({ 
  message = "Loading ShiftFlex...", 
  fullScreen = false,
  debugInfo,
  showForceLogout = false,
  timeoutInMs = 10000
}: LoadingStateProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  // Log for debugging when component mounts
  useEffect(() => {
    console.log(`LoadingState rendered with message: ${message}`);
    if (debugInfo) console.log(`Debug info: ${debugInfo}`);
    
    // Add timeout to show force logout button if loading takes too long
    if (!showForceLogout && timeoutInMs > 0) {
      const timer = setTimeout(() => {
        console.log("Loading timeout reached - showing force logout option");
        const loadingElement = document.getElementById('loading-state-container');
        if (loadingElement) {
          const forceLogoutButton = document.createElement('button');
          forceLogoutButton.innerText = 'Force Logout';
          forceLogoutButton.className = 'px-4 py-2 mt-4 bg-red-600 text-white rounded hover:bg-red-700';
          forceLogoutButton.onclick = async () => {
            try {
              localStorage.clear();
              sessionStorage.clear();
              await signOut();
              console.log("Force logout triggered");
              window.location.href = '/login';
            } catch (error) {
              console.error("Force logout failed:", error);
              window.location.href = '/login';
            }
          };
          loadingElement.appendChild(forceLogoutButton);
        }
      }, timeoutInMs);
      
      return () => clearTimeout(timer);
    }
  }, [message, debugInfo, showForceLogout, timeoutInMs, signOut]);

  const handleForceLogout = async () => {
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      console.log("Storage cleared");
      
      // Attempt to sign out via Supabase
      await signOut();
      console.log("Force logout successful");
      
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error("Force logout error:", error);
      // Hard redirect if error occurs
      window.location.href = '/login';
    }
  };

  const content = (
    <div id="loading-state-container" className="flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-primary/20 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
      <h1 className="text-2xl font-bold mb-4 text-gray-700">{message}</h1>
      {debugInfo && <p className="text-sm text-gray-500 mb-4">{debugInfo}</p>}
      
      {showForceLogout && (
        <Button 
          variant="destructive" 
          onClick={handleForceLogout} 
          className="mt-4"
        >
          Force Logout
        </Button>
      )}
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
