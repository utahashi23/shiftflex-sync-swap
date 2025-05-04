
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from 'lucide-react';
import { fetchAllMatchesSafe } from '@/utils/rls-helpers';
import { supabase } from '@/integrations/supabase/client';

const AllMatchesDebug = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [matchDetails, setMatchDetails] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const { data } = await fetchAllMatchesSafe();
      setMatches(data || []);
      
      // Fetch additional details for each match
      const details: Record<string, any> = {};
      
      for (const match of data || []) {
        // Get requester request details
        const { data: requesterRequest } = await supabase
          .from('shift_swap_requests')
          .select('*')
          .eq('id', match.requester_request_id)
          .single();
          
        // Get acceptor request details
        const { data: acceptorRequest } = await supabase
          .from('shift_swap_requests')
          .select('*')
          .eq('id', match.acceptor_request_id)
          .single();
          
        // Get shift details for both
        const { data: requesterShift } = await supabase.rpc('get_shift_by_id', { 
          shift_id: match.requester_shift_id 
        });
        
        const { data: acceptorShift } = await supabase.rpc('get_shift_by_id', { 
          shift_id: match.acceptor_shift_id 
        });
        
        // Store all the details
        details[match.id] = {
          requesterRequest,
          acceptorRequest,
          requesterShift: requesterShift?.[0] || null,
          acceptorShift: acceptorShift?.[0] || null
        };
      }
      
      setMatchDetails(details);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMatches();
  }, []);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };
  
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // Format "HH:MM" from "HH:MM:SS"
  };
  
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between">
          All Database Matches
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchMatches}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Matches
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>All potential matches from the database</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Request 1 Shift Date</TableHead>
              <TableHead>Request 2 Shift Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading matches...
                  </div>
                </TableCell>
              </TableRow>
            ) : matches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No matches found
                </TableCell>
              </TableRow>
            ) : (
              matches.map((match) => {
                const details = matchDetails[match.id] || {};
                const requesterShiftDate = details.requesterShift?.date;
                const acceptorShiftDate = details.acceptorShift?.date;
                
                return (
                  <TableRow key={match.id}>
                    <TableCell className="font-mono text-xs">{match.id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant={match.status === 'pending' ? 'outline' : 'secondary'}>
                        {match.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(match.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {formatDate(requesterShiftDate)}
                      {details.requesterShift && (
                        <div className="text-xs text-muted-foreground">
                          {formatTime(details.requesterShift?.start_time)} - {formatTime(details.requesterShift?.end_time)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(acceptorShiftDate)}
                      {details.acceptorShift && (
                        <div className="text-xs text-muted-foreground">
                          {formatTime(details.acceptorShift?.start_time)} - {formatTime(details.acceptorShift?.end_time)}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AllMatchesDebug;
