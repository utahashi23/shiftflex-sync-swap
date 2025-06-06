import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fetchAllSwapRequestsSafe, fetchAllPreferredDatesWithRequestsSafe } from '@/utils/rls-helpers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SwapRequest {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  status: string;
  created_at: string;
  preferred_dates_count: number;
  shift_date?: string; 
}

interface PreferredDate {
  id: string;
  date: string;
  accepted_types: string[];
  request_id: string;
  request: SwapRequest;
}

export const AllSwapsTable = () => {
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [preferredDates, setPreferredDates] = useState<PreferredDate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const { isAdmin } = useAuth();

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // Fetch all swap requests
      const { data: requestsData } = await fetchAllSwapRequestsSafe();
      
      // Fetch shift data for each request
      const enrichedRequests = await Promise.all((requestsData || []).map(async (request) => {
        // Get the shift data using the request's requester_shift_id
        const { data: shiftData } = await supabase.rpc('get_shift_by_id', { shift_id: request.requester_shift_id });
        
        return {
          ...request,
          shift_date: shiftData?.[0]?.date || 'Unknown' // Add the shift date to the request object
        };
      }));
      
      setSwapRequests(enrichedRequests || []);
      
      // Fetch all preferred dates with related request data
      const { data: rawDatesData } = await fetchAllPreferredDatesWithRequestsSafe();
      
      if (rawDatesData) {
        // Transform the data to match the PreferredDate interface
        const transformedDates: PreferredDate[] = await Promise.all(rawDatesData.map(async (date: any) => {
          // For each date, get its associated request with shift date
          const requestInfo = enrichedRequests?.find(req => req.id === date.request_id) || null;
          
          return {
            id: date.id,
            date: date.date,
            accepted_types: date.accepted_types,
            request_id: date.request_id,
            request: requestInfo ? {
              id: requestInfo.id,
              requester_id: requestInfo.requester_id,
              requester_shift_id: requestInfo.requester_shift_id,
              status: requestInfo.status,
              created_at: requestInfo.created_at,
              preferred_dates_count: requestInfo.preferred_dates_count,
              shift_date: requestInfo.shift_date
            } : {} as SwapRequest
          };
        }));
        
        setPreferredDates(transformedDates);
      } else {
        setPreferredDates([]);
      }
    } catch (error) {
      console.error('Error fetching test data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = () => {
    fetchAllData();
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getTimeSince = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">All Swap Requests {!isAdmin && "(Admin Only)"}</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Swap Requests ({swapRequests.length})</TabsTrigger>
          <TabsTrigger value="dates">Preferred Dates ({preferredDates.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests">
          <Table>
            <TableCaption>All swap requests from all users</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Shift Date</TableHead>
                <TableHead>Preferred Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {swapRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading swap requests...' : 'No swap requests found'}
                  </TableCell>
                </TableRow>
              ) : (
                swapRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">{request.id.substring(0, 8)}...</TableCell>
                    <TableCell className="font-mono text-xs">{request.requester_id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant={request.status === 'pending' ? 'outline' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getTimeSince(request.created_at)}</TableCell>
                    <TableCell>{formatDate(request.shift_date)}</TableCell>
                    <TableCell>{request.preferred_dates_count || 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="dates">
          <Table>
            <TableCaption>All preferred dates from all swap requests</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Preferred Date</TableHead>
                <TableHead>Shift Date</TableHead>
                <TableHead>Accepted Types</TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead>Requester</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preferredDates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading preferred dates...' : 'No preferred dates found'}
                  </TableCell>
                </TableRow>
              ) : (
                preferredDates.map((date) => (
                  <TableRow key={date.id}>
                    <TableCell>{formatDate(date.date)}</TableCell>
                    <TableCell>
                      {date.request && formatDate(date.request.shift_date || 'Unknown')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {date.accepted_types.map(type => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {date.request_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {date.request?.requester_id 
                        ? date.request.requester_id.substring(0, 8) + '...'
                        : 'Unknown'
                      }
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AllSwapsTable;
