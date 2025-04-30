
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
import { Database, Users, Truck, Plus, Loader2, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/hooks/auth/supabase-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppRole } from '@/types/database';

// Interface for user data structure
interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: AppRole;
  status: string;
}

// Interface for truck data structure
interface TruckData {
  id: string;
  name: string;
  status: string;
}

const Admin = () => {
  useAuthRedirect({ protectedRoute: true, adminRoute: true });
  
  const queryClient = useQueryClient();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Form state for new user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch users with profiles and roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch all users from auth.users via profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');
      
      if (profilesError) throw profilesError;
      
      // Get roles for these users
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;
      
      // Get auth data for these users (we need emails)
      // In a real app we would use admin functions for this
      // This is mocked for demo purposes
      const mockAuthData = profiles.map(profile => ({
        id: profile.id,
        email: `user-${profile.id.substring(0, 6)}@example.com`,
        status: 'active',
      }));
      
      // Combine data
      const userData: UserData[] = profiles.map(profile => {
        const authData = mockAuthData.find(u => u.id === profile.id);
        const roleData = userRoles.find(r => r.user_id === profile.id);
        
        return {
          id: profile.id,
          name: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : authData?.email.split('@')[0] || 'Unnamed User',
          email: authData?.email || '',
          role: roleData?.role || 'user',
          status: authData?.status || 'pending',
        };
      });
      
      return userData;
    }
  });
  
  // Fetch trucks
  const { data: trucks, isLoading: trucksLoading } = useQuery({
    queryKey: ['admin-trucks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('truck_names')
        .select('*');
      
      if (error) throw error;
      return data as TruckData[];
    }
  });
  
  // Create admin user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      try {
        // 1. Sign up the new user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: newUserEmail,
          password: newUserPassword,
          options: {
            data: {
              first_name: newUserFirstName,
              last_name: newUserLastName
            }
          }
        });
        
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Failed to create user");
        
        // 2. Add the user role (if admin)
        if (newUserRole === 'admin') {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: signUpData.user.id,
              role: 'admin'
            });
          
          if (roleError) throw roleError;
        }
        
        return signUpData;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: `Successfully created user ${newUserEmail} with ${newUserRole} role.`,
      });
      setAddUserDialogOpen(false);
      resetUserForm();
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create User",
        description: error.message || "There was an error creating the user.",
        variant: "destructive",
      });
    }
  });
  
  const resetUserForm = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserRole('user');
  };
  
  const handleSubmitUserForm = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate();
  };
  
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>System Management</CardTitle>
              <CardDescription>
                Manage users and app settings
              </CardDescription>
            </div>
            <Button 
              onClick={() => setAddUserDialogOpen(true)}
              className="shrink-0"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
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
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <div className="flex justify-center items-center">
                              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                              <span>Loading users...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : users && users.length > 0 ? (
                        users.map((user) => (
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
                                user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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
                      {trucksLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">
                            <div className="flex justify-center items-center">
                              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                              <span>Loading trucks...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : trucks && trucks.length > 0 ? (
                        trucks.map((truck) => (
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
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                            No trucks found
                          </TableCell>
                        </TableRow>
                      )}
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
      
      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with optional admin role.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitUserForm}>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Create a secure password"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <select 
                  id="role"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as AppRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="user">Regular User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddUserDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!newUserEmail || !newUserPassword || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Admin;
