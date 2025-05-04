
import StatCard from './StatCard';
import { CalendarClock, Repeat, Clock, Check } from 'lucide-react';
import { DashboardStats as DashboardStatsType } from '@/hooks/useDashboardData';

interface DashboardStatsProps {
  stats: DashboardStatsType;
  isLoading: boolean;
}

const DashboardStats = ({ stats, isLoading }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard 
        title="My Total Rostered Shifts"
        value={stats.totalShifts}
        description="For the current month"
        icon={<CalendarClock className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
      
      <StatCard 
        title="My Active Swap Requests"
        value={stats.activeSwaps}
        description="Pending approval or match"
        icon={<Repeat className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
      
      <StatCard 
        title="My Matched Swaps"
        value={stats.matchedSwaps}
        description="Ready for approval"
        icon={<Clock className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
      
      <StatCard 
        title="My Completed Swaps"
        value={stats.completedSwaps}
        description="Successfully exchanged"
        icon={<Check className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
    </div>
  );
};

export default DashboardStats;
