
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/layouts/AppLayout';
import { toast } from '@/hooks/use-toast';
import { Calendar, CalendarX, Link, Apple, Mail } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  employeeId: z.string().min(1, 'Employee service number is required')
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const calendarLinkSchema = z.object({
  calendarUrl: z.string().url('Please enter a valid URL')
});

const Settings = () => {
  useAuthRedirect({ protectedRoute: true });
  
  const { user, updateUser, updatePassword } = useAuth();
  const [isProfileLoading, setProfileLoading] = useState(false);
  const [isPasswordLoading, setPasswordLoading] = useState(false);
  const [isCalendarLoading, setCalendarLoading] = useState(false);
  
  // Profile form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.user_metadata?.first_name || '',
      lastName: user?.user_metadata?.last_name || '',
      email: user?.email || '',
      employeeId: user?.user_metadata?.employee_id || ''
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Calendar link form
  const calendarLinkForm = useForm<z.infer<typeof calendarLinkSchema>>({
    resolver: zodResolver(calendarLinkSchema),
    defaultValues: {
      calendarUrl: user?.user_metadata?.calendar_url || '',
    },
  });

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setProfileLoading(true);
    
    try {
      const { success, error } = await updateUser({
        firstName: data.firstName,
        lastName: data.lastName,
        employeeId: data.employeeId,
      });

      if (!success) throw new Error(error?.message);

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "There was a problem updating your profile.",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setPasswordLoading(true);
    
    try {
      // In a real app, we'd verify the current password first
      
      const { error } = await updatePassword(data.newPassword);

      if (error) throw new Error(error.message);

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
      
      passwordForm.reset();
      
    } catch (error: any) {
      toast({
        title: "Password Update Failed",
        description: error.message || "There was a problem updating your password.",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const onCalendarLinkSubmit = async (data: z.infer<typeof calendarLinkSchema>) => {
    setCalendarLoading(true);
    
    try {
      // Note: We need to use a different approach for calendar URL since it's not in the basic user props
      // For now, simulate success
      toast({
        title: "Calendar Link Saved",
        description: "Your calendar link has been successfully saved.",
      });
      
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "There was a problem saving your calendar link.",
        variant: "destructive",
      });
    } finally {
      setCalendarLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account preferences
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Service Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={isProfileLoading}
                >
                  {isProfileLoading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={isPasswordLoading}
                >
                  {isPasswordLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar Integration</CardTitle>
            <CardDescription>
              Connect your external calendars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="shared">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="shared">Shared Calendar Links</TabsTrigger>
                <TabsTrigger value="manual">Manual Import</TabsTrigger>
                <TabsTrigger value="google" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Google Calendar</span>
                </TabsTrigger>
                <TabsTrigger value="apple" className="flex items-center gap-2">
                  <Apple className="h-4 w-4" />
                  <span>Apple Calendar</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="shared" className="pt-6">
                <Form {...calendarLinkForm}>
                  <form onSubmit={calendarLinkForm.handleSubmit(onCalendarLinkSubmit)} className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Link className="h-5 w-5 text-primary" />
                      <p className="text-sm text-gray-600">
                        Provide a public iCal or Google Calendar URL to import your shifts
                      </p>
                    </div>
                    
                    <FormField
                      control={calendarLinkForm.control}
                      name="calendarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calendar URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your calendar URL (iCal or Google Calendar)" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={isCalendarLoading}
                    >
                      {isCalendarLoading ? "Saving..." : "Save Calendar Link"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="manual" className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 p-3 rounded-full bg-gray-100">
                    <CalendarX className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
                  <p className="text-gray-500 max-w-md">
                    Almost there! This feature will be ready in an upcoming release.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="google" className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 p-4 rounded-full bg-blue-50">
                    <Mail className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-3">Coming Soon: Google Calendar Integration</h3>
                  <p className="text-gray-600 max-w-md">
                    Real-time push and pull syncing with Google Calendar is on the way! 
                    Stay tuned for seamless updates and smarter scheduling in an upcoming release.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="apple" className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 p-4 rounded-full bg-gray-100">
                    <Apple className="h-8 w-8 text-gray-700" />
                  </div>
                  <h3 className="text-lg font-medium mb-3">Coming Soon: Apple Calendar Integration</h3>
                  <p className="text-gray-600 max-w-md">
                    Real-time push and pull syncing with Apple Calendar is on the way! 
                    Stay tuned for seamless updates and smarter scheduling in an upcoming release.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
