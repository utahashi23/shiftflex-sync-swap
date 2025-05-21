
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight, Calendar, User, Truck, Search } from 'lucide-react';

export const RecordLookup = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search term',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      let data;

      switch (activeTab) {
        case 'users':
          const { data: userData, error: userError } = await supabase.rpc('admin_search_users', {
            search_term: searchTerm
          });
          
          if (userError) throw userError;
          data = userData;
          break;

        case 'shifts':
          const { data: shiftData, error: shiftError } = await supabase
            .from('shifts')
            .select('*, auth.users!inner(email)')
            .or(`date::text.ilike.%${searchTerm}%,truck_name.ilike.%${searchTerm}%,colleague_type.ilike.%${searchTerm}%`)
            .limit(50);
            
          if (shiftError) throw shiftError;
          
          // Process data to add email
          data = shiftData.map((shift: any) => ({
            ...shift,
            email: shift.auth?.users?.email || 'N/A',
          }));
          break;

        case 'swap_requests':
          const { data: swapData, error: swapError } = await supabase
            .from('shift_swap_requests')
            .select('*, auth.users!inner(email), shifts(*)')
            .or(`status.ilike.%${searchTerm}%,requester_id.ilike.%${searchTerm}%`)
            .limit(50);
            
          if (swapError) throw swapError;
          
          // Process data to add email
          data = swapData.map((swap: any) => ({
            ...swap,
            email: swap.auth?.users?.email || 'N/A',
          }));
          break;

        default:
          data = [];
      }

      setResults(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: 'No results',
          description: 'No matching records found',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Error',
        description: 'Failed to search records',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserResults = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">
              {isLoading ? 'Searching...' : 'No results'}
            </TableCell>
          </TableRow>
        ) : (
          results.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : 'N/A'}
              </TableCell>
              <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.status}
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderShiftResults = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Employee</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Truck</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
              {isLoading ? 'Searching...' : 'No results'}
            </TableCell>
          </TableRow>
        ) : (
          results.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell>{new Date(shift.date).toLocaleDateString()}</TableCell>
              <TableCell>{shift.email || 'N/A'}</TableCell>
              <TableCell>{`${shift.start_time} - ${shift.end_time}`}</TableCell>
              <TableCell>{shift.truck_name || 'N/A'}</TableCell>
              <TableCell>{shift.colleague_type || 'N/A'}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderSwapRequestResults = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Requester</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested On</TableHead>
          <TableHead>Shift Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">
              {isLoading ? 'Searching...' : 'No results'}
            </TableCell>
          </TableRow>
        ) : (
          results.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.email || 'N/A'}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'matched' ? 'bg-blue-100 text-blue-800' :
                  request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {request.status}
                </span>
              </TableCell>
              <TableCell>{new Date(request.created_at).toLocaleString()}</TableCell>
              <TableCell>
                {request.shifts?.date 
                  ? new Date(request.shifts.date).toLocaleDateString()
                  : 'N/A'}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Lookup</CardTitle>
        <CardDescription>
          Search for users, shifts, and swap requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search records..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Shifts
            </TabsTrigger>
            <TabsTrigger value="swap_requests" className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Swap Requests
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="border rounded-md mt-4">
            {renderUserResults()}
          </TabsContent>
          
          <TabsContent value="shifts" className="border rounded-md mt-4">
            {renderShiftResults()}
          </TabsContent>
          
          <TabsContent value="swap_requests" className="border rounded-md mt-4">
            {renderSwapRequestResults()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
