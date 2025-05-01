import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Clock, Repeat, Check, Calendar, CalendarClock, Users, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Import refactored components
import StatCard from '@/components/dashboard/StatCard';
import UpcomingShifts from '@/components/dashboard/UpcomingShifts';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { useDashboardData } from '@/hooks/useDashboardData';
import { fetchAllShifts, fetchAllPreferredDates, fetchAllSwapRequests } from '@/utils/rls-bypass';

const Dashboard = () => {
  useAuthRedirect({ protectedRoute: true });
  const { user, isAdmin } = useAuth();
  const { stats, isLoading } = useDashboardData(user);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [totalActiveSwaps, setTotalActiveSwaps] = useState<number>(0);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState<boolean>(true);
  
  // Enhanced test data for debugging
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [allPreferredDates, setAllPreferredDates] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [isLoadingTestData, setIsLoadingTestData] = useState<boolean>(true);
  const [rlsDebugErrors, setRlsDebugErrors] = useState<string[]>([]);
  
  // Fix the type definition for rlsTestData to handle JSON objects properly
  const [rlsTestData, setRlsTestData] = useState<{
    directQuery: any[],
    rpcQuery: any // Changed from any[] to any to handle JSON object response
  }>({ directQuery: [], rpcQuery: {} }); // Initialize rpcQuery as empty object instead of array

  useEffect(() => {
    const fetchUserCount = async () => {
      setIsLoadingUsers(true);
      try {
        // Use a count query without any filters to get all profiles
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error('Error fetching user count:', error);
        } else {
          console.log('Total profiles count:', count);
          setTotalUsers(count || 0);
        }
      } catch (error) {
        console.error('Error fetching user count:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const fetchTotalActiveSwaps = async () => {
      setIsLoadingSwaps(true);
      try {
        // Get total count of active swap requests (pending with preferred dates)
        const { count, error } = await supabase
          .from('shift_swap_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gt('preferred_dates_count', 0);
          
        if (error) {
          console.error('Error fetching active swap requests count:', error);
        } else {
          console.log('Total active swap requests:', count);
          setTotalActiveSwaps(count || 0);
        }
      } catch (error) {
        console.error('Error fetching active swap requests count:', error);
      } finally {
        setIsLoadingSwaps(false);
      }
    };

    // Enhanced debug function specifically targeting RLS bypass methods
    const fetchExtendedTestData = async () => {
      setIsLoadingTestData(true);
      setRlsDebugErrors([]);
      
      try {
        console.log('=== ENHANCED RLS TEST: Starting comprehensive fetching test ===');
        console.log(`Current user ID: ${user?.id}`);
        console.log(`Is admin: ${isAdmin}`);
        
        // METHOD 1: Test all shifts fetching with new utility
        const shiftsResult = await fetchAllShifts();
        if (shiftsResult.error) {
          setRlsDebugErrors(prev => [...prev, `Error fetching shifts: ${shiftsResult.error.message}`]);
        } else {
          console.log(`RLS Bypass: Found ${shiftsResult.data?.length || 0} shifts`);
          setAllShifts(shiftsResult.data || []);
        }
        
        // METHOD 2: Test preferred dates fetching with new utility
        const datesResult = await fetchAllPreferredDates();
        if (datesResult.error) {
          setRlsDebugErrors(prev => [...prev, `Error fetching preferred dates: ${datesResult.error.message}`]);
        } else {
          console.log(`RLS Bypass: Found ${datesResult.data?.length || 0} preferred dates`);
          setAllPreferredDates(datesResult.data || []);
        }
        
        // METHOD 3: Test swap requests fetching with new utility
        const requestsResult = await fetchAllSwapRequests();
        if (requestsResult.error) {
          setRlsDebugErrors(prev => [...prev, `Error fetching swap requests: ${requestsResult.error.message}`]);
        } else {
          console.log(`RLS Bypass: Found ${requestsResult.data?.length || 0} swap requests`);
          setAllRequests(requestsResult.data || []);
        }
        
        // Direct test for admin access to shifts (for comparison)
        if (isAdmin) {
          const { data: adminData, error: adminError } = await supabase
            .from('shifts')
            .select('*');
          
          if (adminError) {
            setRlsDebugErrors(prev => [...prev, `Admin direct query error: ${adminError.message}`]);
          } else {
            console.log(`Admin direct query found ${adminData?.length || 0} shifts`);
          }
        }
        
        // Special admin RPC test
        try {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('test_admin_access');
            
          if (rpcError) {
            console.error('RPC admin test failed:', rpcError);
            setRlsDebugErrors(prev => [...prev, `RPC admin test error: ${rpcError.message}`]);
          } else {
            console.log('RPC admin test result:', rpcData);
            // Fixed type assignment - ensure we treat rpcData as a single object, not an array
            setRlsTestData(prev => ({
              ...prev,
              rpcQuery: rpcData || {}  // Initialize as empty object if null
            }));
          }
        } catch (rpcErr: any) {
          setRlsDebugErrors(prev => [...prev, `RPC call error: ${rpcErr.message}`]);
        }
        
        console.log('=== ENHANCED RLS TEST: Testing complete ===');
      } catch (error: any) {
        console.error('Error fetching extended test data:', error);
        setRlsDebugErrors(prev => [...prev, `General error: ${error.message}`]);
      } finally {
        setIsLoadingTestData(false);
      }
    };

    fetchUserCount();
    fetchTotalActiveSwaps();
    fetchExtendedTestData();
  }, [user, isAdmin]);

  return (
    <AppLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {user?.user_metadata?.first_name || 'User'}
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

      {/* Enhanced Debug Test Block - Will be removed after testing */}
      <div className="mb-8 p-4 border border-red-300 bg-red-50 rounded-lg">
        <h2 className="text-lg font-bold text-red-700 mb-2">ENHANCED RLS DEBUG DATA (Will be removed)</h2>
        {isLoadingTestData ? (
          <p>Loading test data...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold">All Shifts ({allShifts.length})</h3>
                <div className="max-h-40 overflow-y-auto text-xs border rounded p-2 mt-1">
                  {allShifts.length === 0 ? (
                    <p className="text-red-500">No shifts found! RLS may be blocking access.</p>
                  ) : (
                    <pre>{JSON.stringify(allShifts.map(s => ({
                      id: s.id?.substring(0, 8),
                      user_id: s.user_id?.substring(0, 8),
                      date: s.date,
                      start: s.start_time
                    })), null, 2)}</pre>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold">All Preferred Dates ({allPreferredDates.length})</h3>
                <div className="max-h-40 overflow-y-auto text-xs border rounded p-2 mt-1">
                  {allPreferredDates.length === 0 ? (
                    <p className="text-red-500">No preferred dates found! RLS may be blocking access.</p>
                  ) : (
                    <pre>{JSON.stringify(allPreferredDates.map(d => ({
                      id: d.id?.substring(0, 8),
                      request_id: d.request_id?.substring(0, 8),
                      date: d.date,
                      types: d.accepted_types
                    })), null, 2)}</pre>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold">All Swap Requests ({allRequests.length})</h3>
                <div className="max-h-40 overflow-y-auto text-xs border rounded p-2 mt-1">
                  {allRequests.length === 0 ? (
                    <p className="text-red-500">No swap requests found! RLS may be blocking access.</p>
                  ) : (
                    <pre>{JSON.stringify(allRequests.map(r => ({
                      id: r.id?.substring(0, 8),
                      requester_id: r.requester_id?.substring(0, 8),
                      status: r.status,
                      dates_count: r.preferred_dates_count
                    })), null, 2)}</pre>
                  )}
                </div>
              </div>
            </div>
            
            {rlsDebugErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <h3 className="font-semibold text-red-800">Errors Encountered:</h3>
                <ul className="list-disc pl-5 text-sm mt-1">
                  {rlsDebugErrors.map((err, i) => (
                    <li key={i} className="text-red-700">{err}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <h3 className="font-semibold text-yellow-800">RLS Analysis</h3>
              <p className="text-sm mb-2">
                {allShifts.length === 0 && allPreferredDates.length === 0 ? 
                  "RLS is likely blocking cross-user data access. DB functions needed." :
                  `Found some data. Test for complete access: Shifts (${allShifts.length}), Dates (${allPreferredDates.length}), Requests (${allRequests.length})`
                }
              </p>
              <p className="text-sm font-medium">
                Current User ID: {user?.id?.substring(0, 8) || 'Not logged in'} | Admin: {isAdmin ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UpcomingShifts 
          shifts={stats.upcomingShifts} 
          isLoading={isLoading} 
        />
        
        <RecentActivity 
          activities={stats.recentActivity} 
          isLoading={isLoading} 
        />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
