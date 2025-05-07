
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
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  employeeId: z.string().min(1, 'Employee service number is required')
});

export const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  const [isProfileLoading, setProfileLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      employeeId: ''
    },
  });

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setIsInitialLoading(false);
        return;
      }
      
      try {
        // Fetch the profile data from the database
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, employee_id')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Error fetching profile data:", error);
          toast({
            title: "Error",
            description: "Failed to load profile data. Please try again.",
            variant: "destructive",
          });
        } else if (profileData) {
          // Update form with data from database
          profileForm.reset({
            firstName: profileData.first_name || user?.user_metadata?.first_name || '',
            lastName: profileData.last_name || user?.user_metadata?.last_name || '',
            email: user?.email || '',
            employeeId: profileData.employee_id || user?.user_metadata?.employee_id || ''
          });
        }
      } catch (error) {
        console.error("Error in profile data fetch:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchProfileData();
  }, [user, profileForm]);

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setProfileLoading(true);
    
    try {
      // Update the user metadata in auth
      const { success, error } = await updateUser({
        firstName: data.firstName,
        lastName: data.lastName,
        employeeId: data.employeeId,
      });

      if (!success) throw new Error(error?.message);

      // Update the profiles table as well
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          employee_id: data.employeeId
        })
        .eq('id', user?.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        throw new Error(profileError.message);
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

  if (isInitialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Loading your profile information</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
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
              {isProfileLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Saving...
                </>
              ) : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
