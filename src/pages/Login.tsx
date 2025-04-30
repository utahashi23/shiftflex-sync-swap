
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import AuthLayout from '@/layouts/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { toast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const Login = () => {
  useAuthRedirect({ authRoutes: true });
  
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = (location.state as any)?.returnUrl || '/dashboard';
  
  const [isLoading, setIsLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  // Login form
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Password reset form
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        if (error.message.includes('not verified')) {
          navigate('/verify-email', { state: { email: data.email } });
          return;
        }
        throw new Error(error.message);
      }

      toast({
        title: "Login Successful",
        description: "You have successfully logged in.",
      });
      
      navigate(returnUrl);
      
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (data: z.infer<typeof resetSchema>) => {
    try {
      const { error } = await resetPassword(data.email);

      if (error) throw new Error(error.message);

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for a link to reset your password.",
      });
      
      setResetDialogOpen(false);
      resetForm.reset();
      
    } catch (error: any) {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthLayout title="Log in to your account">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email" {...field} />
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
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm"
                    type="button"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    Forgot password?
                  </Button>
                </div>
                <FormControl>
                  <Input type="password" placeholder="Enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
          
          <div className="text-center text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </Form>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
                <Button type="button" variant="outline" onClick={() => setResetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Send Reset Link
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
};

export default Login;
