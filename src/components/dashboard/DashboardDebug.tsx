
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllShifts, fetchAllPreferredDates, fetchAllSwapRequests } from '@/utils/rls-bypass';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Fix the type definition for rlsTestData to handle JSON objects properly
  const [rlsTestData, setRlsTestData] = useState<{
    directQuery: any[],
    rpcQuery: any // Changed from any[] to any to handle JSON object response
  }>({ directQuery: [], rpcQuery: {} }); // Initialize rpcQuery as empty object instead of array

  useEffect(() => {
    // Enhanced debug function specifically targeting our updated RLS bypass methods
    const fetchExtendedTestData = async () => {
      setIsLoadingTestData(true);
      setRlsDebugErrors([]);
      
      try {
        console.log('=== ENHANCED RLS TEST: Starting comprehensive fetching test ===');
        console.log(`Current user ID: ${user?.id}`);
        console.log(`Is admin: ${isAdmin}`);
        
        // METHOD 1: Test all shifts fetching with our updated utility
        const shiftsResult = await fetchAllShifts();
        if (shiftsResult.error) {
          setRlsDebugErrors(prev => [...prev, `Error fetching shifts: ${shiftsResult.error.message}`]);
        } else {
          console.log(`RLS Bypass: Found ${shiftsResult.data?.length || 0} shifts`);
          setAllShifts(shiftsResult.data || []);
        }
        
        // METHOD 2: Test preferred dates fetching with our updated utility
        const datesResult = await fetchAllPreferredDates();
        if (datesResult.error) {
          setRlsDebugErrors(prev => [...prev, `Error fetching preferred dates: ${datesResult.error.message}`]);
        } else {
          console.log(`RLS Bypass: Found ${datesResult.data?.length || 0} preferred dates`);
          setAllPreferredDates(datesResult.data || []);
        }
        
        // METHOD 3: Test swap requests fetching with our updated utility
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
        
        // Special admin RPC test using our new function
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

    if (user) {
      fetchExtendedTestData();
    }
  }, [user, isAdmin]);

  if (!isVisible) return null;

  return (
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
          
          <div className="mt-4 p-3 bg-green-50 border border-green-300 rounded-lg">
            <h3 className="font-semibold text-green-800">Admin RPC Test Results</h3>
            <pre className="text-xs overflow-x-auto mt-2">
              {JSON.stringify(rlsTestData.rpcQuery, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDebug;
