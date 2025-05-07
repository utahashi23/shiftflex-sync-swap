
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  employeeId: z.string().min(1, 'Employee service number is required')
});

export const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  const [isProfileLoading, setProfileLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: user?.email || '',
      employeeId: ''
    },
  });

  // Load profile data from the database
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: 'Failed to load profile',
            description: error.message,
            variant: 'destructive',
          });
        } else if (data) {
          setProfileData(data);
          profileForm.reset({
            firstName: data.first_name || user?.user_metadata?.first_name || '',
            lastName: data.last_name || user?.user_metadata?.last_name || '',
            email: user?.email || '',
            employeeId: data.employee_id || user?.user_metadata?.employee_id || ''
          });
        }
      } catch (error: any) {
        console.error('Error in profile fetch:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setProfileLoading(true);
    
    try {
      // First, update Supabase auth metadata
      const { success, error } = await updateUser({
        firstName: data.firstName,
        lastName: data.lastName,
        employeeId: data.employeeId,
      });

      if (!success) throw new Error(error?.message || 'Failed to update user metadata');

      // Then update the profile record in the database
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            employee_id: data.employeeId
          })
          .eq('id', user.id);

        if (profileError) throw new Error(profileError.message);
      }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your personal information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingProfile ? (
          <div className="flex justify-center py-4">
            <div className="animate-pulse">Loading profile...</div>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};
