
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllShifts, fetchAllPreferredDates, fetchAllSwapRequests } from '@/utils/rls-bypass';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DashboardDebugProps {
  isVisible?: boolean;
}

const DashboardDebug = ({ isVisible = true }: DashboardDebugProps) => {
  const { user, isAdmin } = useAuth();
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [allPreferredDates, setAllPreferredDates] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [isLoadingTestData, setIsLoadingTestData] = useState<boolean>(true);
  const [rlsDebugErrors, setRlsDebugErrors] = useState<string[]>([]);
  const [rlsTestData, setRlsTestData] = useState<{
    directQuery: any[],
    rpcQuery: any
  }>({ directQuery: [], rpcQuery: {} });

  const fetchExtendedTestData = async () => {
    setIsLoadingTestData(true);
    setRlsDebugErrors([]);
    
    try {
      console.log('=== ENHANCED RLS TEST: Starting comprehensive fetching test ===');
      console.log(`Current user ID: ${user?.id}`);
      console.log(`Is admin: ${isAdmin}`);
      
      // TEST 1: Fetch all shifts with enhanced error tracking
      console.log('TEST 1: Fetching all shifts...');
      const shiftsResult = await fetchAllShifts();
      
      if (shiftsResult.error) {
        console.error('Shift fetching error:', shiftsResult.error);
        setRlsDebugErrors(prev => [...prev, `Error fetching shifts: ${shiftsResult.error.message}`]);
      } else if (!shiftsResult.data || shiftsResult.data.length === 0) {
        console.warn('No shifts data returned despite successful query');
        setRlsDebugErrors(prev => [...prev, 'No shifts found. RLS may be blocking cross-user access.']);
      } else {
        console.log(`RLS Bypass SUCCESS: Found ${shiftsResult.data?.length || 0} shifts`);
        setAllShifts(shiftsResult.data || []);
      }
      
      // TEST 2: Fetch all preferred dates with enhanced error tracking
      console.log('TEST 2: Fetching all preferred dates...');
      const datesResult = await fetchAllPreferredDates();
      
      if (datesResult.error) {
        console.error('Preferred dates fetching error:', datesResult.error);
        setRlsDebugErrors(prev => [...prev, `Error fetching preferred dates: ${datesResult.error.message}`]);
      } else if (!datesResult.data || datesResult.data.length === 0) {
        console.warn('No preferred dates returned despite successful query');
        setRlsDebugErrors(prev => [...prev, 'No preferred dates found. RLS may be blocking cross-user access.']);
      } else {
        console.log(`RLS Bypass SUCCESS: Found ${datesResult.data?.length || 0} preferred dates`);
        setAllPreferredDates(datesResult.data || []);
      }
      
      // TEST 3: Fetch swap requests (this part is working correctly)
      console.log('TEST 3: Fetching all swap requests...');
      const requestsResult = await fetchAllSwapRequests();
      
      if (requestsResult.error) {
        setRlsDebugErrors(prev => [...prev, `Error fetching swap requests: ${requestsResult.error.message}`]);
      } else {
        console.log(`RLS Bypass SUCCESS: Found ${requestsResult.data?.length || 0} swap requests`);
        setAllRequests(requestsResult.data || []);
      }
      
      // Test admin RPC function
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('test_admin_access');
          
        if (rpcError) {
          console.error('RPC admin test failed:', rpcError);
          setRlsDebugErrors(prev => [...prev, `RPC admin test error: ${rpcError.message}`]);
        } else {
          console.log('RPC admin test result:', rpcData);
          setRlsTestData(prev => ({
            ...prev,
            rpcQuery: rpcData || {}
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

  useEffect(() => {
    if (user) {
      fetchExtendedTestData();
    }
  }, [user, isAdmin]);

  const handleRefreshData = () => {
    fetchExtendedTestData();
    toast({
      title: "Refreshing data",
      description: "Fetching the latest data with your admin status..."
    });
  };

  if (!isVisible) return null;

  return (
    <div className="mb-8 p-4 border border-red-300 bg-red-50 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-red-700">ENHANCED RLS DEBUG DATA (Will be removed)</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshData}
          disabled={isLoadingTestData}
          className="flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingTestData ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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
            <h3 className="font-semibold text-yellow-800">Admin Status Check</h3>
            <div className="flex items-center mt-1">
              <div className={`w-3 h-3 rounded-full mr-2 ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <p className="text-sm font-medium">
                Admin Status: {isAdmin ? 'Active' : 'Inactive'} 
                {!isAdmin && ' - Role update may require logout/login to take effect'}
              </p>
            </div>
            <p className="text-sm mt-2">
              Current User ID: {user?.id?.substring(0, 8) || 'Not logged in'}
            </p>
          </div>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-300 rounded-lg">
            <h3 className="font-semibold text-green-800">Admin RPC Test Results</h3>
            <pre className="text-xs overflow-x-auto mt-2">
              {JSON.stringify(rlsTestData.rpcQuery, null, 2)}
            </pre>
            {rlsTestData.rpcQuery?.shifts_access === 'restricted' && (
              <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded text-sm">
                <p className="font-medium text-amber-800">
                  Note: You have been added as an admin in the database, but your session may need to be refreshed.
                  Try logging out and logging back in to activate your admin privileges.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDebug;
