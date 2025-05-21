
import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Download } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  user_id: string;
  message: string;
  details: any;
  email?: string;
}

const LOG_TYPES = [
  'All',
  'auth',
  'swap_request',
  'swap_match',
  'shift_created',
  'shift_updated',
  'error',
  'system',
  'admin_action',
];

export const SystemLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [logType, setLogType] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      
      // Build query
      let query = supabase
        .from('function_execution_log')
        .select('*, auth.users!inner(email)')
        .order('timestamp', { ascending: false })
        .range((page - 1) * 20, page * 20 - 1);
      
      // Apply filters if needed
      if (logType !== 'All') {
        query = query.eq('event_type', logType);
      }
      
      if (searchTerm) {
        query = query.or(`message.ilike.%${searchTerm}%,details.ilike.%${searchTerm}%`);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Process logs to add email
      const processedLogs = data.map((log: any) => ({
        ...log,
        email: log.auth?.users?.email || 'N/A',
      }));
      
      setLogs(processedLogs);
      setTotalPages(Math.ceil((count || 0) / 20));
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system logs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, logType]);

  const handleSearch = () => {
    setPage(1); // Reset to first page when searching
    fetchLogs();
  };

  const exportLogs = () => {
    try {
      // Convert logs to CSV
      const headers = ['Timestamp', 'Event Type', 'User ID', 'Email', 'Message', 'Details'];
      const csv = [
        headers.join(','),
        ...logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.event_type,
          log.user_id,
          log.email || 'N/A',
          `"${log.message.replace(/"/g, '""')}"`,
          `"${JSON.stringify(log.details).replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `system-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to export logs',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">System Logs</h2>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search logs..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        
        <div className="w-40">
          <Select value={logType} onValueChange={setLogType}>
            <SelectTrigger>
              <SelectValue placeholder="Select log type" />
            </SelectTrigger>
            <SelectContent>
              {LOG_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.event_type === 'error' ? 'bg-red-100 text-red-800' :
                      log.event_type === 'auth' ? 'bg-blue-100 text-blue-800' :
                      log.event_type === 'admin_action' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {log.event_type}
                    </span>
                  </TableCell>
                  <TableCell>{log.email || 'N/A'}</TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {page} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
