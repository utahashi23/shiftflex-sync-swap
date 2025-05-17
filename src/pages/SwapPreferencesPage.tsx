
import { useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import SwapPreferences from '@/components/SwapPreferences';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/hooks/useAuth';

const SwapPreferencesPage = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  
  useEffect(() => {
    document.title = 'Swap Preferences';
  }, []);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Swap Preferences</h1>
        <p className="text-gray-500 mt-1">
          Set your preferences for shift swaps
          {isAdmin && <span className="ml-2 text-blue-500">(Admin Access)</span>}
        </p>
      </div>
      
      <div className="max-w-3xl">
        <SwapPreferences />
      </div>
    </AppLayout>
  );
};

export default SwapPreferencesPage;
