
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Filter, User, UserRound, Database, Table2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  organization: string;
  created_at: string;
}

interface ShiftData {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  truck_name: string | null;
  user_id: string;
  user_name: string;
  status: string;
}

interface SwapRequestData {
  id: string;
  status: string;
  created_at: string;
  requester_name: string;
  requester_id: string;
  shift_date: string | null;
}

const AdminData = () => {
  // Protect this route for admins only
  useAuthRedirect({ protectedRoute: true, adminRoute: true });
  
  // State for tabs and data
  const [activeTab, setActiveTab] = useState('users');
  const [isLoading, setIsLoading] = useState(true);
  
  // Users data state
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [userSortField, setUserSortField] = useState('created_at');
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('desc');

  // Shifts data state
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<ShiftData[]>([]);
  const [shiftFilter, setShiftFilter] = useState('');
  const [shiftTypeFilter, setShiftTypeFilter] = useState('all');
  
  // Swap requests data state
  const [swapRequests, setSwapRequests] = useState<SwapRequestData[]>([]);
  const [filteredSwapRequests, setFilteredSwapRequests] = useState<SwapRequestData[]>([]);
  const [swapFilter, setSwapFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, employee_id, organization, created_at, auth.users(email)')
          .order(userSortField, { ascending: userSortDirection === 'asc' });
          
        if (error) {
          console.error('Error fetching users:', error);
          throw error;
        }

        if (data) {
          const formattedData: UserData[] = data.map((item: any) => ({
            id: item.id,
            first_name: item.first_name || '',
            last_name: item.last_name || '',
            email: item.users?.email || '',
            employee_id: item.employee_id || '',
            organization: item.organization || '',
            created_at: new Date(item.created_at).toLocaleString(),
          }));
          
          setUsers(formattedData);
          setFilteredUsers(formattedData);
        }
      } catch (error) {
        toast({
          title: 'Error fetching user data',
          description: 'Please try again or contact support.',
          variant: 'destructive',
        });
      }
    };

    if (activeTab === 'users') {
      setIsLoading(true);
      fetchUsers().finally(() => setIsLoading(false));
    }
  }, [activeTab, userSortField, userSortDirection]);

  // Fetch shifts data
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        // Using the specialized function to get all shifts bypassing RLS
        const { data, error } = await supabase.rpc('get_all_shifts');
        
        if (error) {
          console.error('Error fetching shifts:', error);
          throw error;
        }

        if (data) {
          // We need to get user names for each shift
          const userIds = [...new Set(data.map((shift: any) => shift.user_id))];
          
          // Fetch user names
          const { data: userProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);
            
          if (profileError) {
            console.error('Error fetching user profiles:', profileError);
            throw profileError;
          }
          
          // Create a map of user IDs to names
          const userMap = new Map();
          userProfiles?.forEach(profile => {
            userMap.set(profile.id, `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User');
          });
          
          const formattedShifts: ShiftData[] = data.map((shift: any) => ({
            id: shift.id,
            date: new Date(shift.date).toLocaleDateString(),
            start_time: shift.start_time,
            end_time: shift.end_time,
            truck_name: shift.truck_name,
            user_id: shift.user_id,
            user_name: userMap.get(shift.user_id) || 'Unknown User',
            status: shift.status,
          }));
          
          setShifts(formattedShifts);
          setFilteredShifts(formattedShifts);
        }
      } catch (error) {
        toast({
          title: 'Error fetching shift data',
          description: 'Please try again or contact support.',
          variant: 'destructive',
        });
      }
    };

    if (activeTab === 'shifts') {
      setIsLoading(true);
      fetchShifts().finally(() => setIsLoading(false));
    }
  }, [activeTab]);

  // Fetch swap requests data
  useEffect(() => {
    const fetchSwapRequests = async () => {
      try {
        // Using the specialized function to get all swap requests
        const { data, error } = await supabase.rpc('get_all_swap_requests');
        
        if (error) {
          console.error('Error fetching swap requests:', error);
          throw error;
        }

        if (data) {
          // We need to fetch user names and shift dates
          const userIds = [...new Set(data.map((request: any) => request.requester_id))];
          const shiftIds = data.map((request: any) => request.requester_shift_id).filter(Boolean);
          
          // Fetch user profiles
          const { data: userProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);
            
          if (profileError) {
            console.error('Error fetching user profiles:', profileError);
            throw profileError;
          }
          
          // Fetch shifts
          const { data: shiftData, error: shiftError } = await supabase
            .from('shifts')
            .select('id, date')
            .in('id', shiftIds);
            
          if (shiftError) {
            console.error('Error fetching shifts:', shiftError);
            throw shiftError;
          }
          
          // Create user and shift maps
          const userMap = new Map();
          userProfiles?.forEach(profile => {
            userMap.set(profile.id, `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User');
          });
          
          const shiftMap = new Map();
          shiftData?.forEach(shift => {
            shiftMap.set(shift.id, shift.date);
          });
          
          const formattedRequests: SwapRequestData[] = data.map((request: any) => ({
            id: request.id,
            status: request.status,
            created_at: new Date(request.created_at).toLocaleString(),
            requester_id: request.requester_id,
            requester_name: userMap.get(request.requester_id) || 'Unknown User',
            shift_date: request.requester_shift_id ? 
              shiftMap.get(request.requester_shift_id) ? 
                new Date(shiftMap.get(request.requester_shift_id)).toLocaleDateString() : null 
              : null
          }));
          
          setSwapRequests(formattedRequests);
          setFilteredSwapRequests(formattedRequests);
        }
      } catch (error) {
        toast({
          title: 'Error fetching swap request data',
          description: 'Please try again or contact support.',
          variant: 'destructive',
        });
      }
    };

    if (activeTab === 'swaps') {
      setIsLoading(true);
      fetchSwapRequests().finally(() => setIsLoading(false));
    }
  }, [activeTab]);

  // Filter users based on search input
  useEffect(() => {
    if (userFilter.trim() === '') {
      setFilteredUsers(users);
    } else {
      const lowerFilter = userFilter.toLowerCase();
      const filtered = users.filter(user => 
        user.first_name.toLowerCase().includes(lowerFilter) ||
        user.last_name.toLowerCase().includes(lowerFilter) ||
        user.email.toLowerCase().includes(lowerFilter) ||
        user.employee_id.toLowerCase().includes(lowerFilter) ||
        user.organization.toLowerCase().includes(lowerFilter)
      );
      setFilteredUsers(filtered);
    }
  }, [userFilter, users]);

  // Filter shifts based on search input and shift type
  useEffect(() => {
    let filtered = shifts;
    
    if (shiftFilter.trim() !== '') {
      const lowerFilter = shiftFilter.toLowerCase();
      filtered = filtered.filter(shift => 
        shift.truck_name?.toLowerCase().includes(lowerFilter) ||
        shift.user_name.toLowerCase().includes(lowerFilter) ||
        shift.date.includes(lowerFilter)
      );
    }
    
    if (shiftTypeFilter !== 'all') {
      filtered = filtered.filter(shift => {
        const hour = parseInt(shift.start_time.split(':')[0]);
        switch(shiftTypeFilter) {
          case 'day': return hour <= 8;
          case 'afternoon': return hour > 8 && hour < 16;
          case 'night': return hour >= 16;
          default: return true;
        }
      });
    }
    
    setFilteredShifts(filtered);
  }, [shiftFilter, shiftTypeFilter, shifts]);

  // Filter swap requests based on search input and status
  useEffect(() => {
    let filtered = swapRequests;
    
    if (swapFilter.trim() !== '') {
      const lowerFilter = swapFilter.toLowerCase();
      filtered = filtered.filter(request => 
        request.requester_name.toLowerCase().includes(lowerFilter) ||
        (request.shift_date && request.shift_date.includes(lowerFilter))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }
    
    setFilteredSwapRequests(filtered);
  }, [swapFilter, statusFilter, swapRequests]);

  // Sort users
  const sortUsers = (field: string) => {
    if (userSortField === field) {
      setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortField(field);
      setUserSortDirection('asc');
    }
  };

  // Get shift type display class
  const getShiftTypeClass = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour <= 8) return 'bg-yellow-100 text-yellow-800';
    if (hour > 8 && hour < 16) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getShiftTypeLabel = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour <= 8) return 'Day';
    if (hour > 8 && hour < 16) return 'Afternoon';
    return 'Night';
  };

  // Reset all filters
  const resetFilters = () => {
    if (activeTab === 'users') {
      setUserFilter('');
      setFilteredUsers(users);
    } else if (activeTab === 'shifts') {
      setShiftFilter('');
      setShiftTypeFilter('all');
      setFilteredShifts(shifts);
    } else if (activeTab === 'swaps') {
      setSwapFilter('');
      setStatusFilter('all');
      setFilteredSwapRequests(swapRequests);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Data</h1>
        <p className="text-gray-500 mt-1">
          View and manage system data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>View and filter data from across the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="shifts" className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                <span>Shifts</span>
              </TabsTrigger>
              <TabsTrigger value="swaps" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Swap Requests</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search users..."
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="pl-10"
                  />
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={resetFilters} className="whitespace-nowrap">
                    <Filter className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => sortUsers('first_name')}>
                          Name {userSortField === 'first_name' && (userSortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => sortUsers('email')}>
                          Email {userSortField === 'email' && (userSortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => sortUsers('employee_id')}>
                          ID {userSortField === 'employee_id' && (userSortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => sortUsers('organization')}>
                          Org {userSortField === 'organization' && (userSortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => sortUsers('created_at')}>
                          Created {userSortField === 'created_at' && (userSortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No users found matching your search criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.employee_id || '-'}</TableCell>
                            <TableCell>{user.organization || '-'}</TableCell>
                            <TableCell>{user.created_at}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="p-4 text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {users.length} users
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Shifts Tab */}
            <TabsContent value="shifts" className="space-y-4">
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search shifts..."
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value)}
                    className="pl-10"
                  />
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
                <Select value={shiftTypeFilter} onValueChange={setShiftTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Shift type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All shift types</SelectItem>
                    <SelectItem value="day">Day shift</SelectItem>
                    <SelectItem value="afternoon">Afternoon shift</SelectItem>
                    <SelectItem value="night">Night shift</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={resetFilters}>
                  <Filter className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
              
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Truck</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShifts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No shifts found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredShifts.map((shift) => (
                          <TableRow key={shift.id}>
                            <TableCell>{shift.date}</TableCell>
                            <TableCell>{shift.start_time} - {shift.end_time}</TableCell>
                            <TableCell>{shift.truck_name || '-'}</TableCell>
                            <TableCell>
                              <Badge className={getShiftTypeClass(shift.start_time)}>
                                {getShiftTypeLabel(shift.start_time)}
                              </Badge>
                            </TableCell>
                            <TableCell>{shift.user_name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={shift.status === 'scheduled' ? 'outline' : 'default'}
                                className={shift.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {shift.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="p-4 text-sm text-muted-foreground">
                    Showing {filteredShifts.length} of {shifts.length} shifts
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Swap Requests Tab */}
            <TabsContent value="swaps" className="space-y-4">
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search swap requests..."
                    value={swapFilter}
                    onChange={(e) => setSwapFilter(e.target.value)}
                    className="pl-10"
                  />
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="matched">Matched</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={resetFilters}>
                  <Filter className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
              
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead>Shift Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSwapRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No swap requests found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSwapRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {request.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>{request.requester_name}</TableCell>
                            <TableCell>{request.shift_date || '-'}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={request.status === 'pending' ? 'outline' : 'default'}
                                className={
                                  request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  request.status === 'matched' ? 'bg-blue-100 text-blue-800' :
                                  request.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''
                                }
                              >
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{request.created_at}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="p-4 text-sm text-muted-foreground">
                    Showing {filteredSwapRequests.length} of {swapRequests.length} swap requests
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default AdminData;
