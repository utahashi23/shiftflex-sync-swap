
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeSelect } from '@/components/ui/safe-select';
import { MultiSelect } from '@/components/swaps/MultiSelect';
import { useColleagueTypes } from '@/hooks/useColleagueTypes';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useUserSkillsets } from '@/hooks/useUserSkillsets';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  employeeId: z.string().min(1, 'Employee service number is required'),
  organization: z.string().optional(),
});

export const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  const [isProfileLoading, setProfileLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isEmailChangeLoading, setIsEmailChangeLoading] = useState(false);
  const [selectedSkillsets, setSelectedSkillsets] = useState<string[]>([]);
  
  const { colleagueTypes, isLoading: isLoadingColleagueTypes } = useColleagueTypes();
  const { organizations, isLoading: isLoadingOrgs } = useOrganizations();
  const { userSkillsets, updateUserSkillsets } = useUserSkillsets();
  
  const emailChangeForm = useForm<z.infer<typeof emailChangeSchema>>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      newEmail: '',
      password: '',
    },
    mode: 'onChange',
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: user?.email || '',
      employeeId: '',
      organization: '',
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
            employeeId: data.employee_id || user?.user_metadata?.employee_id || '',
            organization: data.organization || '',
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

  // Set initial selected skillsets based on user's existing skillsets
  useEffect(() => {
    if (userSkillsets.length > 0) {
      const skillsetIds = userSkillsets.map(us => us.skillset_id);
      setSelectedSkillsets(skillsetIds);
    }
  }, [userSkillsets]);

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
            employee_id: data.employeeId,
            organization: data.organization
          })
          .eq('id', user.id);

        if (profileError) throw new Error(profileError.message);
        
        // Update user skillsets
        await updateUserSkillsets(selectedSkillsets);
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

  const emailChangeSchema = z.object({
    newEmail: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  });

  const onEmailChangeSubmit = async (data: z.infer<typeof emailChangeSchema>) => {
    setIsEmailChangeLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser(
        { 
          email: data.newEmail 
        }, 
        { 
          emailRedirectTo: `${window.location.origin}/settings` 
        }
      );
      
      if (error) throw error;
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your new email inbox and click the link to verify your new address.",
      });
      
      setEmailDialogOpen(false);
      emailChangeForm.reset();
    } catch (error: any) {
      toast({
        title: "Email Change Failed",
        description: error.message || "There was a problem changing your email.",
        variant: "destructive",
      });
    } finally {
      setIsEmailChangeLoading(false);
    }
  };

  // Map colleague types to format needed for MultiSelect
  const colleagueTypeOptions = colleagueTypes.map(type => ({
    value: type.id,
    label: type.name
  }));

  // Map organizations to format needed for SafeSelect
  const organizationOptions = organizations.map((org, index) => ({
    value: org,
    label: org
  }));

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
          <>
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
                
                <div className="flex items-end gap-4">
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setEmailDialogOpen(true)}
                  >
                    Change Email
                  </Button>
                </div>
                
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

                <FormField
                  control={profileForm.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <FormControl>
                        <SafeSelect
                          options={[
                            { value: '', label: 'Select an organization' },
                            ...organizationOptions
                          ]}
                          placeholder="Select your organization"
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          disabled={isLoadingOrgs}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel>Skill Set</FormLabel>
                  <div className="mt-1.5">
                    <MultiSelect
                      options={colleagueTypeOptions}
                      selected={selectedSkillsets}
                      onChange={setSelectedSkillsets}
                      placeholder="Select your skills"
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isProfileLoading}
                >
                  {isProfileLoading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>

            {/* Email change dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change your email address</DialogTitle>
                  <DialogDescription>
                    Enter your new email address and password to confirm the change.
                    You'll need to verify your new email address.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...emailChangeForm}>
                  <form onSubmit={emailChangeForm.handleSubmit(onEmailChangeSubmit)} className="space-y-4 py-4">
                    <FormField
                      control={emailChangeForm.control}
                      name="newEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your new email address" 
                              type="email" 
                              autoComplete="email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={emailChangeForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your password" 
                              type="password" 
                              autoComplete="current-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setEmailDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isEmailChangeLoading}
                      >
                        {isEmailChangeLoading ? "Processing..." : "Change Email"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
};
