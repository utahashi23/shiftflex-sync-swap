
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { toast } from '@/hooks/use-toast';
import { Database, Users, Truck } from 'lucide-react';

// Mock user data
const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active', role: 'User' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Active', role: 'User' },
  { id: 3, name: 'Admin User', email: 'sfadmin', status: 'Active', role: 'Admin' },
];

// Mock truck data
const mockTrucks = [
  { id: 1, name: '02-MAT01', status: 'Active' },
  { id: 2, name: '04-MAT03', status: 'Active' },
  { id: 3, name: '06-MAT07', status: 'Active' },
  { id: 4, name: '08-MAT11', status: 'Active' },
  { id: 5, name: '09-MAT12', status: 'Active' },
];

const Admin = () => {
  useAuthRedirect({ protectedRoute: true, adminRoute: true });
  
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const handleResetDatabase = () => {
    setIsResetting(true);
    
    // Simulate database reset
    setTimeout(() => {
      setIsResetting(false);
      setResetDialogOpen(false);
      
      toast({
        title: "Database Reset",
        description: "The test database has been successfully reset.",
      });
    }, 2000);
  };
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Manage system settings and users
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>
                Reset and manage the test database
              </CardDescription>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setResetDialogOpen(true)}
              className="shrink-0"
            >
              <Database className="h-4 w-4 mr-2" /> 
              Reset Test Database
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Resetting the database will clear all test data and restore initial settings.
              This action cannot be undone.
            </p>
            <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
              <p className="text-sm">
                <strong>Note:</strong> This action only affects the test database and is intended for development purposes.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Management</CardTitle>
            <CardDescription>
              Manage users and app settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users">
              <TabsList>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="trucks">Truck Names</TabsTrigger>
                <TabsTrigger value="logs">System Logs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users" className="pt-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {user.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-4">
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="trucks" className="pt-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Truck Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockTrucks.map((truck) => (
                        <TableRow key={truck.id}>
                          <TableCell>{truck.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {truck.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-4">
                  <Button>
                    <Truck className="h-4 w-4 mr-2" />
                    Add Truck
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="logs" className="pt-6">
                <div className="bg-gray-100 p-4 rounded-md h-64 overflow-y-auto font-mono text-xs">
                  <div className="text-gray-500">[2025-04-30 10:15:23] System started</div>
                  <div className="text-gray-500">[2025-04-30 10:16:45] User login: sfadmin</div>
                  <div className="text-gray-500">[2025-04-30 10:18:12] Shift swap requested: John Doe</div>
                  <div className="text-amber-600">[2025-04-30 10:25:30] Warning: Failed login attempt</div>
                  <div className="text-gray-500">[2025-04-30 10:30:45] User login: jane@example.com</div>
                  <div className="text-gray-500">[2025-04-30 10:32:18] Shift swap matched: Jane Smith & John Doe</div>
                  <div className="text-gray-500">[2025-04-30 10:40:22] User logout: jane@example.com</div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline">Download Logs</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Reset Database Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Test Database?</DialogTitle>
            <DialogDescription>
              This will clear all test data and restore the database to its initial state. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
            <p className="text-sm text-amber-800">
              Warning: All user data, shifts, and swap requests will be permanently deleted.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResetDialogOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleResetDatabase}
              disabled={isResetting}
            >
              {isResetting ? "Resetting..." : "Reset Database"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Admin;
