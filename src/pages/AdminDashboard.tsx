import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Users, 
  BarChart2, 
  ScrollText, 
  Database
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// Mock data for demonstration
const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'User', status: 'Active', lastActive: '2025-05-20' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active', lastActive: '2025-05-21' },
  { id: 3, name: 'Admin User', email: 'admin@example.com', role: 'Admin', status: 'Active', lastActive: '2025-05-22' },
  { id: 4, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'User', status: 'Inactive', lastActive: '2025-04-15' },
  { id: 5, name: 'Mike Wilson', email: 'mike@example.com', role: 'User', status: 'Active', lastActive: '2025-05-18' },
];

const mockLogs = [
  { timestamp: '2025-05-22 08:15:23', level: 'INFO', message: 'User login: admin@example.com', module: 'Authentication' },
  { timestamp: '2025-05-22 08:17:45', level: 'INFO', message: 'Shift swap request created: ID #1234', module: 'ShiftSwap' },
  { timestamp: '2025-05-22 08:32:12', level: 'WARNING', message: 'Failed login attempt: unknown@example.com', module: 'Authentication' },
  { timestamp: '2025-05-22 09:05:30', level: 'ERROR', message: 'Database connection timeout', module: 'Database' },
  { timestamp: '2025-05-22 09:10:45', level: 'INFO', message: 'User logout: john@example.com', module: 'Authentication' },
];

const mockUserStats = [
  { name: 'Jan', total: 24 },
  { name: 'Feb', total: 28 },
  { name: 'Mar', total: 35 },
  { name: 'Apr', total: 42 },
  { name: 'May', total: 50 },
];

const mockSwapStats = [
  { name: 'Jan', pending: 10, completed: 5, rejected: 2 },
  { name: 'Feb', pending: 12, completed: 8, rejected: 3 },
  { name: 'Mar', pending: 8, completed: 15, rejected: 1 },
  { name: 'Apr', pending: 15, completed: 12, rejected: 4 },
  { name: 'May', pending: 20, completed: 18, rejected: 2 },
];

const AdminDashboard = () => {
  // Redirect non-admin users
  useAuthRedirect({ protectedRoute: true, adminRoute: true });
  
  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('users');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Handle search function
  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    
    // Mock search functionality - in a real app, this would query the database
    switch (searchCategory) {
      case 'users':
        setSearchResults(mockUsers.filter(user => 
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        ));
        break;
      case 'shifts':
        setSearchResults([
          { id: 123, user: 'John Doe', date: '2025-05-25', time: '08:00-16:00', type: 'Day Shift' },
          { id: 124, user: 'Jane Smith', date: '2025-05-26', time: '16:00-00:00', type: 'Night Shift' }
        ]);
        break;
      case 'swaps':
        setSearchResults([
          { id: 456, requester: 'John Doe', date: '2025-05-25', status: 'Pending' },
          { id: 457, requester: 'Jane Smith', date: '2025-05-26', status: 'Completed' }
        ]);
        break;
      default:
        setSearchResults([]);
    }
  };

  // Filter users based on search term
  const filteredUsers = searchTerm 
    ? mockUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    : mockUsers;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive system administration and monitoring tools.
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <BarChart2 className="h-4 w-4 mr-2" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="logs">
              <ScrollText className="h-4 w-4 mr-2" />
              System Logs
            </TabsTrigger>
            <TabsTrigger value="lookup">
              <Search className="h-4 w-4 mr-2" />
              Record Lookup
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage user accounts in the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4 gap-2">
                  <Input 
                    placeholder="Search by name or email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'Admin' ? "secondary" : "outline"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {/* Fixed: Changed "success" to "secondary" for active users */}
                            <Badge variant={user.status === 'Active' ? "secondary" : "destructive"}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.lastActive}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {mockUsers.length} users
                  </div>
                  <Button>
                    <Users className="mr-2 h-4 w-4" />
                    Add New User
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>
                    Monthly user registration statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={mockUserStats}
                        margin={{
                          top: 10,
                          right: 30,
                          left: 0,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shift Swap Activity</CardTitle>
                  <CardDescription>
                    Monthly shift swap request statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={mockSwapStats}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="pending" fill="#8884d8" />
                        <Bar dataKey="completed" fill="#82ca9d" />
                        <Bar dataKey="rejected" fill="#ff8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>
                  Review system activities and errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockLogs.map((log, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                          <TableCell>
                            {/* Fixed: Changed "warning" to "secondary" for WARNING logs */}
                            <Badge 
                              variant={
                                log.level === 'ERROR' ? "destructive" : 
                                log.level === 'WARNING' ? "secondary" : 
                                "default"
                              }
                            >
                              {log.level}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.module}</TableCell>
                          <TableCell>{log.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing recent logs
                  </div>
                  <Button variant="outline">
                    Export Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Record Lookup Tab */}
          <TabsContent value="lookup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Record Lookup</CardTitle>
                <CardDescription>
                  Search across all system records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="grid flex-1 gap-2">
                    <Input 
                      placeholder="Search by name, email, ID..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                  >
                    <option value="users">Users</option>
                    <option value="shifts">Shifts</option>
                    <option value="swaps">Swap Requests</option>
                  </select>
                  <Button onClick={handleSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="rounded-md border mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(searchResults[0]).map((key) => (
                            <TableHead key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((result, index) => (
                          <TableRow key={index}>
                            {Object.values(result).map((value, idx) => (
                              <TableCell key={idx}>{value as string}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {searchTerm && searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-semibold">No records found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try changing your search term or category
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
