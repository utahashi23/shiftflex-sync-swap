
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
      
      // For demo purposes, we'll generate some sample logs instead of querying a non-existent table
      const sampleLogs: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          event_type: 'auth',
          user_id: '123',
          message: 'User logged in successfully',
          details: { ip: '192.168.1.1', device: 'browser' },
          email: 'user1@example.com'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
          event_type: 'swap_request',
          user_id: '456',
          message: 'Swap request created',
          details: { request_id: 'abc123', shift_id: 'shift_xyz' },
          email: 'user2@example.com'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
          event_type: 'error',
          user_id: '789',
          message: 'Failed authentication attempt',
          details: { reason: 'invalid credentials', attempts: 3 },
          email: 'user3@example.com'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
          event_type: 'system',
          user_id: '123',
          message: 'System backup completed',
          details: { status: 'success', files_backed_up: 237 },
          email: 'admin@example.com'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          event_type: 'admin_action',
          user_id: '123',
          message: 'User role updated',
          details: { target_user: 'user3@example.com', new_role: 'admin' },
          email: 'admin@example.com'
        },
        {
          id: '6',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
          event_type: 'shift_created',
          user_id: '456',
          message: 'New shift created',
          details: { shift_id: 'shift_123', date: '2025-05-25' },
          email: 'scheduler@example.com'
        }
      ];
      
      // Filter logs based on search term and log type
      let filteredLogs = sampleLogs;
      
      if (searchTerm) {
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (logType !== 'All') {
        filteredLogs = filteredLogs.filter(log => log.event_type === logType);
      }
      
      // Set total pages based on 20 items per page
      setTotalPages(Math.max(1, Math.ceil(filteredLogs.length / 20)));
      
      // Paginate the results
      const startIdx = (page - 1) * 20;
      const endIdx = page * 20;
      const paginatedLogs = filteredLogs.slice(startIdx, endIdx);
      
      setLogs(paginatedLogs);
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
