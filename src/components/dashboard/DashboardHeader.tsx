
import { useAuth } from '@/hooks/useAuth';
import { Users, FileText, ShieldCheck } from 'lucide-react';

interface DashboardHeaderProps {
  totalUsers: number;
  totalActiveSwaps: number;
  isLoadingUsers: boolean;
  isLoadingSwaps: boolean;
}

const DashboardHeader = ({ 
  totalUsers, 
  totalActiveSwaps, 
  isLoadingUsers, 
  isLoadingSwaps 
}: DashboardHeaderProps) => {
  const { user, isAdmin } = useAuth();

  return (
    <div className="mb-8 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {user?.user_metadata?.first_name || 'User'}
          {isAdmin && <span className="ml-2 text-xs inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Admin
          </span>}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-secondary/60 px-4 py-2 rounded-lg">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <span className="text-sm text-gray-500">Total Users</span>
            <p className="font-medium">{isLoadingUsers ? '...' : totalUsers}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-secondary/60 px-4 py-2 rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <span className="text-sm text-gray-500">All Active Requests</span>
            <p className="font-medium">{isLoadingSwaps ? '...' : totalActiveSwaps}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
