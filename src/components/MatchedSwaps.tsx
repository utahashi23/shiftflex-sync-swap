import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from '@/hooks/use-toast';
import { ArrowRight, Check, Clock, Filter, Sunrise, Sun, Moon, Bug, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types
interface ShiftDetail {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  colleagueType?: string;
  colleague?: string;
}

interface MatchedSwap {
  id: string;
  originalShift: ShiftDetail;
  matchedShift: ShiftDetail;
  status: string;
  requester_id?: string;
  isTestData?: boolean;
}

interface UserProfile {
  id: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
  created_at?: string;
}

interface MatchedSwapsProps {
  testMode?: boolean;
}

const MatchedSwapsComponent = ({ testMode = false }: MatchedSwapsProps) => {
  const [swapRequests, setSwapRequests] = useState<MatchedSwap[]>([]);
  const [pastSwaps, setPastSwaps] = useState<MatchedSwap[]>([]);
  const [allSwapRequests, setAllSwapRequests] = useState<MatchedSwap[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [testViewMode, setTestViewMode] = useState<'swaps' | 'users'>('swaps');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, swapId: string | null }>({
    isOpen: false,
    swapId: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (testMode) {
      fetchAllSwapRequests();
      fetchAllUsers();
    } else {
      fetchMatchedSwaps();
    }
  }, [testMode, user]);

  const fetchAllUsers = async () => {
    setIsLoading(true);
    
    try {
      console.log('TEST MODE: Fetching all users from auth');
      
      // Fetch all users from auth.users via admin API
      const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
        
      if (authUsersError) {
        console.error('Error fetching auth users:', authUsersError);
        
        // Fallback to profiles if we can't access auth users (common for non-admin users)
        console.log('Falling back to profiles table');
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name');
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }
        
        console.log('TEST MODE: Found profiles:', profiles?.length || 0);
        
        // Convert profiles to user profiles for display
        const userProfiles: UserProfile[] = profiles?.map(profile => ({
          id: profile.id,
          user_metadata: {
            first_name: profile.first_name || 'Unknown',
            last_name: profile.last_name || 'User',
          }
        })) || [];
        
        setUsers(userProfiles);
        return;
      }
      
      if (authUsers?.users) {
        console.log('TEST MODE: Found auth users:', authUsers.users.length);
        setUsers(authUsers.users);
      } else {
        console.log('No auth users found in response');
        setUsers([]);
      }
      
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Try one more alternative approach - fetch users who have shifts
      try {
        console.log('Attempting to fetch users who have shifts');
        const { data: shiftUsers, error: shiftUsersError } = await supabase
          .from('shifts')
          .select('user_id')
          .distinct();
          
        if (shiftUsersError) {
          console.error('Error fetching users with shifts:', shiftUsersError);
          throw shiftUsersError;
        }
        
        if (shiftUsers && shiftUsers.length > 0) {
          const usersList: UserProfile[] = shiftUsers.map(u => ({
            id: u.user_id,
            email: `user-${u.user_id.substring(0, 6)}@example.com`,
          }));
          
          console.log('Found users with shifts:', usersList.length);
          setUsers(usersList);
        } else {
          // Last resort - set empty array
          setUsers([]);
        }
      } catch (fallbackError) {
        console.error('Fallback users fetch failed:', fallbackError);
        setUsers([]);
      }
      
      toast({
        title: "Test Mode Error",
        description: "There was a problem loading user data. " + (error instanceof Error ? error.message : ''),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllSwapRequests = async () => {
    setIsLoading(true);
    
    try {
      console.log('TEST MODE: Fetching all swap requests');
      
      // Fetch ALL swap requests regardless of status
      const { data: requests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id,
          status,
          created_at
        `);
        
      if (requestsError) {
        console.error('Error fetching swap requests:', requestsError);
        throw requestsError;
      }
      
      console.log('TEST MODE: Found swap requests:', requests?.length || 0, requests);
      
      if (!requests || requests.length === 0) {
        setAllSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Get all shift IDs to fetch in one query
      const allShiftIds = [
        ...requests.map(m => m.requester_shift_id),
        ...requests.map(m => m.acceptor_shift_id).filter(Boolean)
      ].filter(Boolean) as string[];
      
      if (allShiftIds.length === 0) {
        setAllSwapRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch all shift details
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', allShiftIds);
        
      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        throw shiftsError;
      }
      
      console.log('TEST MODE: Found shifts:', shiftsData?.length || 0);
      
      // Separately fetch profiles to get names - using users endpoint in Supabase
      let userProfilesMap: Record<string, any> = {};
      
      try {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name');
        
        if (!userError && userData) {
          userData.forEach(profile => {
            userProfilesMap[profile.id] = {
              first_name: profile.first_name || 'Unknown',
              last_name: profile.last_name || 'User'
            };
          });
          console.log('Found user profiles:', userData.length);
        } else {
          console.log('Note: Could not fetch profiles:', userError);
        }
      } catch (profileError) {
        console.log('Error fetching profiles:', profileError);
      }
      
      // Process all requests for display
      const formattedRequests = requests.map(request => {
        // Find the shifts
        const requesterShift = shiftsData?.find(s => s.id === request.requester_shift_id);
        
        if (!requesterShift) {
          console.log(`Missing shift data for request ${request.id}`);
          return null;
        }
        
        // For acceptor shift, use it if available or create a placeholder
        let acceptorShift = null;
        if (request.acceptor_shift_id) {
          acceptorShift = shiftsData?.find(s => s.id === request.acceptor_shift_id);
        }
        
        // Format the shifts for display
        const formatShift = (shift: any, isOriginal: boolean): ShiftDetail => {
          if (!shift) {
            return {
              id: 'not-assigned',
              date: 'Not assigned',
              title: 'Not assigned',
              startTime: '',
              endTime: '',
              type: 'day',
              colleagueType: 'Unknown'
            };
          }
          
          // Determine shift type
          let type = 'day';
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour <= 8) {
            type = 'day';
          } else if (startHour > 8 && startHour < 16) {
            type = 'afternoon';
          } else {
            type = 'night';
          }
          
          // Get user name if available
          let userName = 'Unknown User';
          const userId = isOriginal ? request.requester_id : (request.acceptor_id || '');
          
          if (userId && userProfilesMap[userId]) {
            const profile = userProfilesMap[userId];
            userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed User';
          } else if (userId) {
            // If no profile found, just use truncated user ID
            userName = `User ${userId.substring(0, 6)}`;
          }
            
          return {
            id: shift.id,
            date: shift.date,
            title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.start_time.substring(0, 5),
            endTime: shift.end_time.substring(0, 5),
            type,
            colleagueType: 'Unknown',
            ...(isOriginal ? {} : { colleague: userName })
          };
        };
        
        return {
          id: request.id,
          requester_id: request.requester_id,
          originalShift: formatShift(requesterShift, true),
          matchedShift: formatShift(acceptorShift, false),
          status: request.status
        };
      }).filter(Boolean) as MatchedSwap[];
      
      console.log('TEST MODE: Formatted requests:', formattedRequests.length);
      setAllSwapRequests(formattedRequests);
      
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast({
        title: "Test Mode Error",
        description: "There was a problem loading swap requests. " + (error instanceof Error ? error.message : ''),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatchedSwaps = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Fetch active matched swaps
      const { data: activeMatches, error: activeError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id
        `)
        .or(`requester_id.eq.${user.id},acceptor_id.eq.${user.id}`)
        .eq('status', 'matched');
        
      if (activeError) throw activeError;
      
      // Fetch completed swaps
      const { data: completedMatches, error: completedError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          status,
          requester_id,
          requester_shift_id,
          acceptor_id,
          acceptor_shift_id
        `)
        .or(`requester_id.eq.${user.id},acceptor_id.eq.${user.id}`)
        .eq('status', 'completed');
        
      if (completedError) throw completedError;
      
      // If no data, set empty arrays and return
      if ((!activeMatches || activeMatches.length === 0) && 
          (!completedMatches || completedMatches.length === 0)) {
        setSwapRequests([]);
        setPastSwaps([]);
        setIsLoading(false);
        return;
      }
      
      // Get all shift IDs to fetch in one query
      const allShiftIds = [
        ...(activeMatches || []).map(m => m.requester_shift_id),
        ...(activeMatches || []).map(m => m.acceptor_shift_id).filter(Boolean),
        ...(completedMatches || []).map(m => m.requester_shift_id),
        ...(completedMatches || []).map(m => m.acceptor_shift_id).filter(Boolean)
      ].filter(Boolean) as string[];
      
      if (allShiftIds.length === 0) {
        setSwapRequests([]);
        setPastSwaps([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch all shift details
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', allShiftIds);
        
      if (shiftsError) throw shiftsError;
      
      // Get profiles data separately to avoid foreign key error
      const userIds = [
        ...(activeMatches || []).map(m => m.requester_id),
        ...(activeMatches || []).map(m => m.acceptor_id).filter(Boolean),
        ...(completedMatches || []).map(m => m.requester_id),
        ...(completedMatches || []).map(m => m.acceptor_id).filter(Boolean)
      ].filter(Boolean) as string[];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      // Create profiles lookup
      const profilesMap: Record<string, any> = {};
      if (!profilesError && profilesData) {
        profilesData.forEach(profile => {
          profilesMap[profile.id] = profile;
        });
      }
      
      // Process active matches
      const formattedActiveMatches = processSwapRequests(activeMatches || [], shiftsData || [], user.id, profilesMap);
      setSwapRequests(formattedActiveMatches);
      
      // Process completed matches
      const formattedCompletedMatches = processSwapRequests(completedMatches || [], shiftsData || [], user.id, profilesMap);
      setPastSwaps(formattedCompletedMatches);
    } catch (error) {
      console.error('Error fetching matched swaps:', error);
      toast({
        title: "Failed to load matched swaps",
        description: "There was a problem loading your matched swaps. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to process swap requests data
  const processSwapRequests = (
    requests: any[], 
    shifts: any[], 
    currentUserId: string,
    profilesMap: Record<string, any> = {}
  ): MatchedSwap[] => {
    return requests
      .map(request => {
        // Find the shifts
        const requesterShift = shifts.find(s => s.id === request.requester_shift_id);
        const acceptorShift = shifts.find(s => s.id === request.acceptor_shift_id);
        
        if (!requesterShift || !acceptorShift) return null;
        
        // Determine which shift is "mine" vs "theirs" based on who's viewing
        const isRequester = request.requester_id === currentUserId;
        const myShift = isRequester ? requesterShift : acceptorShift;
        const theirShift = isRequester ? acceptorShift : requesterShift;
        
        // Format the shift details
        const formatShift = (shift: any, isOriginal: boolean): ShiftDetail => {
          // Determine shift type
          let type = 'day';
          const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
          
          if (startHour <= 8) {
            type = 'day';
          } else if (startHour > 8 && startHour < 16) {
            type = 'afternoon';
          } else {
            type = 'night';
          }
          
          // Get colleague name from profiles map
          let colleague = 'Unknown User';
          const userId = isOriginal ? request.requester_id : request.acceptor_id;
          
          if (userId && profilesMap[userId]) {
            const profile = profilesMap[userId];
            colleague = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed User';
          }
            
          return {
            id: shift.id,
            date: shift.date,
            title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
            startTime: shift.start_time.substring(0, 5),
            endTime: shift.end_time.substring(0, 5),
            type,
            colleagueType: 'Unknown',
            ...(isOriginal ? {} : { colleague })
          };
        };
        
        return {
          id: request.id,
          originalShift: formatShift(myShift, true),
          matchedShift: formatShift(theirShift, false),
          status: request.status
        };
      })
      .filter(Boolean) as MatchedSwap[];
  };

  const handleAcceptSwap = async () => {
    if (!confirmDialog.swapId || !user) return;
    
    setIsLoading(true);
    
    try {
      // Update the swap request status in the database
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status: 'completed' })
        .eq('id', confirmDialog.swapId);
        
      if (error) throw error;
      
      // Update the UI
      const completedSwap = swapRequests.find(s => s.id === confirmDialog.swapId);
      if (completedSwap) {
        // Move from active to completed
        setSwapRequests(prev => prev.filter(s => s.id !== confirmDialog.swapId));
        setPastSwaps(prev => [
          ...prev, 
          { ...completedSwap, status: 'completed' }
        ]);
      }
      
      toast({
        title: "Swap Accepted",
        description: "The shift swap has been successfully accepted.",
      });
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConfirmDialog({ isOpen: false, swapId: null });
      setIsLoading(false);
    }
  };

  // Get shift icon based on type
  const getShiftIcon = (type: string) => {
    switch(type) {
      case 'day':
        return <Sunrise className="h-4 w-4" />;
      case 'afternoon':
        return <Sun className="h-4 w-4" />;
      case 'night':
        return <Moon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Format date to user-friendly string
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get shift type label
  const getShiftTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  // Determine which data to display based on mode
  const displayData = testMode 
    ? allSwapRequests 
    : (activeTab === 'active' ? swapRequests : pastSwaps);
  
  return (
    <div className="space-y-6">
      {testMode && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-md p-4 mb-4 flex items-start">
          <Bug className="h-5 w-5 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium">Test Mode Active</h3>
            <p className="text-sm">Displaying all shift swap requests for all users.</p>
          </div>
        </div>
      )}
      
      {testMode && (
        <Tabs defaultValue="swaps" value={testViewMode} onValueChange={(val) => setTestViewMode(val as 'swaps' | 'users')}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="swaps">All Swap Requests</TabsTrigger>
              <TabsTrigger value="users">All Users</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      )}
      
      {!testMode && (
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="active">Active Matches</TabsTrigger>
              <TabsTrigger value="past">Past Swaps</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" /> Filter
            </Button>
          </div>
        </Tabs>
      )}
      
      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin mb-3"></div>
            <h3 className="text-xl font-medium">Loading Data</h3>
            <p className="text-muted-foreground mt-2">
              {testMode ? (testViewMode === 'swaps' ? "Loading all swap requests..." : "Loading all users...") : "Loading matched swaps..."}
            </p>
          </CardContent>
        </Card>
      ) : testMode && testViewMode === 'users' ? (
        // Display users in test mode
        users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-xl font-medium">No Users Found</h3>
              <p className="text-muted-foreground mt-2">
                No users found in the system. This could be because the Auth API access 
                is restricted or there are no users registered yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(user => (
              <Card key={user.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <div className="p-1.5 rounded-md mr-2 bg-gray-100">
                      <Users className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="truncate">
                      {user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'} {user.user_metadata?.last_name || ''}
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="text-sm">
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <div className="text-muted-foreground">User ID</div>
                        <div className="truncate font-mono text-xs">{user.id}</div>
                      </div>
                      {user.email && (
                        <div>
                          <div className="text-muted-foreground">Email</div>
                          <div className="truncate">{user.email}</div>
                        </div>
                      )}
                      {user.created_at && (
                        <div>
                          <div className="text-muted-foreground">Created</div>
                          <div>{new Date(user.created_at).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : displayData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-xl font-medium">
              {testMode ? "No Swap Requests Found" : (activeTab === 'active' ? "No Matched Swaps" : "No Past Swaps")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {testMode 
                ? "There are no shift swap requests in the database."
                : (activeTab === 'active' 
                  ? "You don't have any matched swap requests yet." 
                  : "You don't have any completed swaps yet."
                )
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        displayData.map(swap => (
          <Card 
            key={swap.id} 
            className={cn(
              swap.id === '170f792f-3de8-42de-a8e7-22fad95d91bc' || swap.id === '79b05905-1075-49f7-af87-e9fac516a7fa' 
                ? "border-amber-400 bg-amber-50" 
                : "",
              activeTab === 'past' ? "opacity-80" : ""
            )}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <div className={cn(
                    "p-1.5 rounded-md mr-2",
                    swap.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-600" :
                    swap.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {getShiftIcon(swap.originalShift.type)}
                  </div>
                  <div>
                    {testMode 
                      ? `Request ID: ${swap.id.substring(0, 8)}...`
                      : (activeTab === 'active' ? "Swap Match Found" : "Completed Swap")
                    }
                  </div>
                </div>
                
                {testMode && (
                  <div className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                    Status: {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  {/* Original Shift */}
                  <div className="flex-1 p-4 border rounded-lg bg-secondary/10">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {testMode ? "Requester's Shift" : (activeTab === 'active' ? "Your Shift" : "Original Shift")}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium flex items-center",
                        swap.originalShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                        swap.originalShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                        "bg-blue-100 text-blue-800"
                      )}>
                        {getShiftIcon(swap.originalShift.type)}
                        <span className="ml-1">{getShiftTypeLabel(swap.originalShift.type)}</span>
                      </div>
                      
                      <div className="text-sm font-medium">
                        {swap.originalShift.title}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Date</div>
                        <div>{formatDate(swap.originalShift.date)}</div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground">Time</div>
                        <div>{swap.originalShift.startTime} - {swap.originalShift.endTime}</div>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground">Colleague</div>
                        <div>{swap.originalShift.colleagueType || 'Unknown'}</div>
                      </div>
                      
                      {testMode && (
                        <div>
                          <div className="text-muted-foreground">Requester ID</div>
                          <div className="truncate">{swap.requester_id?.substring(0, 8)}...</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="hidden md:flex h-10 w-10 rounded-full bg-secondary items-center justify-center">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                    <div className="md:hidden h-10 w-10 rounded-full bg-secondary flex items-center justify-center transform rotate-90">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  
                  {/* Matched Shift */}
                  <div className="flex-1 p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {testMode ? "Requested Swap" : (activeTab === 'active' ? "Matched Shift" : "Swapped Shift")}
                    </div>
                    
                    {swap.matchedShift && swap.matchedShift.id !== 'not-assigned' ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            "px-2 py-1 rounded text-xs font-medium flex items-center",
                            swap.matchedShift.type === 'day' ? "bg-yellow-100 text-yellow-800" : 
                            swap.matchedShift.type === 'afternoon' ? "bg-orange-100 text-orange-800" : 
                            "bg-blue-100 text-blue-800"
                          )}>
                            {getShiftIcon(swap.matchedShift.type)}
                            <span className="ml-1">{getShiftTypeLabel(swap.matchedShift.type)}</span>
                          </div>
                          
                          <div className="text-sm font-medium">
                            {swap.matchedShift.title}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Date</div>
                            <div>{formatDate(swap.matchedShift.date)}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Time</div>
                            <div>{swap.matchedShift.startTime} - {swap.matchedShift.endTime}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Colleague</div>
                            <div>{swap.matchedShift.colleagueType}</div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground">Requested By</div>
                            <div>{swap.matchedShift.colleague}</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-center text-gray-500">
                        {swap.status === 'pending' ? 'No match found yet' : 'No match information available'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center">
                    <div className={cn(
                      "px-
