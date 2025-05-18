
import { useState } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import ImprovedShiftSwaps from '@/components/ImprovedShiftSwaps';
import { useAuth } from '@/hooks/useAuth';

const ShiftSwaps = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shift Swaps</h1>
        <p className="text-gray-500 mt-1">
          Request and manage your shift swaps
          {isAdmin && <span className="ml-2 text-blue-500">(Admin Access)</span>}
        </p>
      </div>

      {/* Improved Shift Swaps System */}
      <div>
        <ImprovedShiftSwaps />
      </div>
    </AppLayout>
  );
};

export default ShiftSwaps;
