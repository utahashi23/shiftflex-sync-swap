
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AuthLayout from '@/layouts/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { toast } from '@/hooks/use-toast';

// Combined schema for all registration fields
const registrationSchema = z.object({
  // Organization fields
  organization: z.string().min(1, 'Please select an organization'),
  organizationCode: z.string().min(1, 'Organization code is required'),
  
  // User fields
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  employeeId: z.string().min(1, 'Employee service number is required'),
});

const Register = () => {
  useAuthRedirect({ authRoutes: true });
  
  const { checkOrganizationCode, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  
  // Single form for all fields
  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      organization: '',
      organizationCode: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      employeeId: '',
    },
    mode: 'onChange',
  });

  // Function to verify organization code
  const verifyOrganizationCode = async () => {
    const organizationCode = form.getValues('organizationCode');
    if (!organizationCode) {
      toast({
        title: "Code Required",
        description: "Please enter an organization code to verify.",
        variant: "destructive",
      });
      return;
    }

    try {
      const isValid = await checkOrganizationCode(organizationCode);
      if (isValid) {
        setCodeVerified(true);
        toast({
          title: "Code Verified",
          description: "Your organization code has been verified.",
        });
      } else {
        toast({
          title: "Invalid Organization Code",
          description: "The organization code you entered is invalid. Please reach out to AV Shift Swap pages for the correct code.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: "There was a problem verifying your organization code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: z.infer<typeof registrationSchema>) => {
    // Verify the code first if not already verified
    if (!codeVerified) {
      try {
        const isValid = await checkOrganizationCode(data.organizationCode);
        if (!isValid) {
          toast({
            title: "Invalid Organization Code",
            description: "Please verify your organization code before registering.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        toast({
          title: "Verification Error",
          description: "There was a problem verifying your organization code. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const { success, error } = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        employeeId: data.employeeId,
        organization: data.organization,
      });

      if (!success) {
        throw new Error(error?.message || "Registration failed");
      }

      toast({
        title: "Registration Successful",
        description: "Please check your email to verify your account before logging in.",
      });
      
      // Reset form
      form.reset();
      setCodeVerified(false);
      
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Your Account">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Organization Details</h3>
            
            <FormField
              control={form.control}
              name="organization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Ambulance Victoria">Ambulance Victoria</SelectItem>
                      <SelectItem value="more to follow..." disabled>more to follow...</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex space-x-2">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="organizationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your organization code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={verifyOrganizationCode}
                  disabled={isLoading}
                >
                  Verify Code
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Create a strong password" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Service Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your employee service number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : "Register"}
          </Button>
          
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
};

export default Register;
