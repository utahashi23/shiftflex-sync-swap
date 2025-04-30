
import { useState, useEffect } from 'react';
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
import { createAdminUser } from '@/hooks/auth/auth-utils';
import LoadingState from '@/components/LoadingState';
import { supabase } from '@/hooks/auth/supabase-client';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const Login = () => {
  const [pageLoading, setPageLoading] = useState(true);
  const { isLoading: authLoading, session, signIn, resetPassword, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = (location.state as any)?.returnUrl || '/dashboard';
  
  const [isLoading, setIsLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);
  const [forceLogoutDialogOpen, setForceLogoutDialogOpen] = useState(false);
  
  // Clear any potentially corrupted auth state on mount
  useEffect(() => {
    const clearStaleAuth = async () => {
      try {
        // Check for URL parameter indicating force logout
        const url = new URL(window.location.href);
        const forceLogout = url.searchParams.get('force_logout');
        
        if (forceLogout === 'true') {
          console.log("Force logout requested via URL parameter");
          await handleForceLogout();
          // Remove the parameter
          url.searchParams.delete('force_logout');
          window.history.replaceState({}, '', url.toString());
          return;
        }
        
        console.log("Login page mounted", { authLoading, session });
      } catch (error) {
        console.error("Error in auth cleanup:", error);
      }
    };
    
    clearStaleAuth();
    
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setPageLoading(false);
      console.log("Safety timeout triggered - forcing loading to complete");
    }, 3000);

    // If auth is already loaded, don't wait
    if (!authLoading) {
      clearTimeout(timeout);
      setPageLoading(false);
      console.log("Auth loading complete");
    }

    return () => clearTimeout(timeout);
  }, [authLoading, session]);
  
  // Handle redirection if user is already logged in
  useEffect(() => {
    if (session && session.user) {
      console.log("User already logged in, redirecting to:", returnUrl);
      navigate(returnUrl);
    }
  }, [session, navigate, returnUrl]);

  // Ensure admin user exists on component mount
  useEffect(() => {
    const ensureAdminExists = async () => {
      try {
        const result = await createAdminUser();
        setAdminCreated(result.exists || !!result.user);
        
        if (!result.exists && result.user) {
          toast({
            title: "Admin Account Created",
            description: "Admin user has been set up successfully.",
          });
        }
      } catch (error) {
        console.error("Error checking admin user:", error);
      }
    };
    
    ensureAdminExists();
  }, []);
  
  const handleForceLogout = async () => {
    try {
      console.log("Performing force logout");
      
      // Clear local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
      console.log("Browser storage cleared");
      
      // Sign out from Supabase - this may fail if the token is invalid
      try {
        await supabase.auth.signOut();
        console.log("Supabase signOut completed");
      } catch (signOutError) {
        console.error("Supabase signOut failed:", signOutError);
        // Continue anyway as we're doing a force logout
      }
      
      // Use our signOut method as fallback
      try {
        await signOut();
        console.log("App signOut completed");
      } catch (appSignOutError) {
        console.error("App signOut failed:", appSignOutError);
        // Continue anyway
      }
      
      toast({
        title: "Force Logout Complete",
        description: "Your session has been reset. Please sign in again.",
      });
      
      // Force reload the page to clear any React state
      window.location.href = '/login';
    } catch (error) {
      console.error("Force logout error:", error);
      // Hard reload as a last resort
      window.location.href = '/login';
    } finally {
      setForceLogoutDialogOpen(false);
    }
  };
  
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
      console.log("Attempting login with:", data.email);
      const { success, error } = await signIn(data.email, data.password);

      if (!success && error) {
        if (error.message && error.message.includes('not verified')) {
          navigate('/verify-email', { state: { email: data.email } });
          return;
        }
        throw new Error(error.message || "Unknown error");
      }

      if (success) {
        console.log("Login successful, will redirect to:", returnUrl);
        toast({
          title: "Login Successful",
          description: "You have successfully logged in.",
        });
        
        navigate(returnUrl);
      }
      
    } catch (error: any) {
      console.error("Login error:", error);
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

  const useAdminLogin = () => {
    form.setValue('email', 'sfadmin');
    form.setValue('password', 'EzySodha1623%');
  };

  // Show loading state if needed
  if (pageLoading) {
    return <LoadingState 
      fullScreen 
      message="Preparing login..." 
      debugInfo={`Auth state: ${authLoading ? 'loading' : 'loaded'}`}
      showForceLogout={false}
    />;
  }

  return (
    <AuthLayout title="Log in to your account">
      <div className="mb-4 flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setForceLogoutDialogOpen(true)}
          className="text-xs"
        >
          Force Logout
        </Button>
      </div>
      
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
          
          <div className="flex justify-between items-center text-sm">
            <span>Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </span>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={useAdminLogin} 
              className="text-xs text-gray-500"
            >
              Use Admin Login
            </Button>
          </div>
          
          <div className="pt-2 text-xs text-gray-500 text-center">
            Admin credentials: sfadmin / EzySodha1623%
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
      
      {/* Force Logout Dialog */}
      <Dialog open={forceLogoutDialogOpen} onOpenChange={setForceLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Logout</DialogTitle>
            <DialogDescription>
              This will clear all authentication data and reset your session. Use this if you're experiencing login issues.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setForceLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleForceLogout}>
              Force Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
};

export default Login;
