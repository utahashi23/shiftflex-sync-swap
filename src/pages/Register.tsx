
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

const organizationSchema = z.object({
  organization: z.string().min(1, 'Please select an organization'),
  code: z.string().min(1, 'Organization code is required'),
});

const registrationSchema = z.object({
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
  const [step, setStep] = useState<'organization' | 'registration'>('organization');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  
  // Organization form
  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organization: '',
      code: '',
    },
  });

  // Registration form
  const registrationForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      employeeId: '',
    },
  });

  const onSubmitOrgForm = async (data: z.infer<typeof organizationSchema>) => {
    const isValid = await checkOrganizationCode(data.code);
    if (isValid) {
      setSelectedOrg(data.organization);
      setStep('registration');
    } else {
      toast({
        title: "Invalid Organization Code",
        description: "The organization code you entered is invalid. Please reach out to AV Shift Swap pages for the correct code.",
        variant: "destructive",
      });
    }
  };

  const onSubmitRegistrationForm = async (data: z.infer<typeof registrationSchema>) => {
    setIsLoading(true);
    
    try {
      const { success, error } = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        employeeId: data.employeeId,
        organization: selectedOrg,
      });

      if (!success) {
        throw new Error(error?.message || "Registration failed");
      }

      toast({
        title: "Registration Successful",
        description: "Please check your email to verify your account before logging in.",
      });
      
      // In a real app, this would navigate to a verification screen
      registrationForm.reset();
      orgForm.reset();
      setStep('organization');
      
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
    <AuthLayout title={step === 'organization' ? "Select Your Organization" : "Create Your Account"}>
      {step === 'organization' ? (
        <Form {...orgForm}>
          <form onSubmit={orgForm.handleSubmit(onSubmitOrgForm)} className="space-y-6">
            <FormField
              control={orgForm.control}
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
            
            <FormField
              control={orgForm.control}
              name="code"
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

            <Button type="submit" className="w-full">Continue</Button>
            
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </Form>
      ) : (
        <Form {...registrationForm}>
          <form onSubmit={registrationForm.handleSubmit(onSubmitRegistrationForm)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={registrationForm.control}
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
                control={registrationForm.control}
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
              control={registrationForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={registrationForm.control}
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
              control={registrationForm.control}
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

            <div className="flex flex-col gap-4 pt-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Registering..." : "Register"}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('organization')}
                disabled={isLoading}
              >
                Back
              </Button>
            </div>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
};

export default Register;
