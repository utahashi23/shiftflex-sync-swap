
import { useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

const Shifts = () => {
  useAuthRedirect({ protectedRoute: true });
  
  useEffect(() => {
    document.title = 'My Shifts';
  }, []);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Shifts</h1>
        <p className="text-gray-500 mt-1">
          View and manage your scheduled shifts
        </p>
      </div>
      
      <div className="text-center p-8 border border-dashed rounded-lg">
        <p className="text-muted-foreground">
          Shift data will be displayed here
        </p>
      </div>
    </AppLayout>
  );
};

export default Shifts;
