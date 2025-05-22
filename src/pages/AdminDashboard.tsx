
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/hooks/auth';
import AppLayout from '@/layouts/AppLayout';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, ScrollText, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Mock data for demonstration - keeping the same mock data
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

// Debug component for displaying auth state
const AuthDebug = ({ data }) => (
  <div className="mb-4 p-4 bg-gray-100 rounded-md text-sm">
    <h3 className="font-medium mb-1">Auth Debug Info</h3>
    <pre className="whitespace-pre-wrap overflow-auto max-h-40">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

const AdminDashboard = () => {
  // Get auth state directly with added adminCheckComplete flag
  const { user, isAdmin, isLoading, adminCheckComplete } = useAuth();
  
  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter users based on search term
  const filteredUsers = searchTerm 
    ? mockUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    : mockUsers;

  // Track admin check attempts for debugging
  const [checkAttempts, setCheckAttempts] = useState(0);
  
  // Increment check attempts for tracking
  useEffect(() => {
    const timer = setTimeout(() => {
      setCheckAttempts(prev => prev + 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [checkAttempts]);

  // Display loading state
  if (isLoading || !adminCheckComplete) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 mb-4 rounded-full animate-spin border-t-2 border-primary border-solid mx-auto"></div>
            <p className="text-gray-500">Loading dashboard...</p>
            {checkAttempts > 5 && (
              <div className="mt-4 text-sm text-amber-600">
                <p>Still checking admin status... ({checkAttempts} attempts)</p>
                <AuthDebug data={{
                  userId: user?.id,
                  email: user?.email,
                  isAdmin,
                  adminCheckComplete,
                  checkAttempts
                }} />
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Display error if there's an auth issue
  if (!user || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center p-8 bg-destructive/10 border border-destructive/20 rounded-lg max-w-2xl w-full">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-destructive mb-4">Admin Access Required</h2>
            
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Access Error</AlertTitle>
              <AlertDescription>
                You need to be logged in as an administrator to access this page.
              </AlertDescription>
            </Alert>
            
            <AuthDebug data={{
              userId: user?.id,
              isAdmin,
              adminCheckComplete,
              email: user?.email,
              metadata: user?.user_metadata,
            }} />
            
            <div className="mt-6">
              <Button variant="default" onClick={() => window.location.href = '/dashboard'}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Always show debug information for troubleshooting */}
      <AuthDebug data={{
        userId: user.id,
        email: user.email,
        isAdmin,
        adminCheckComplete,
        metadata: user.user_metadata,
      }} />
      
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
            <TabsTrigger value="logs">
              <ScrollText className="h-4 w-4 mr-2" />
              System Logs
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
                            <Badge variant={user.status === 'Active' ? "default" : "destructive"}>
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
              </CardContent>
            </Card>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
