
import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
import { MailCheck } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const resendSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const VerifyEmail = () => {
  const { user } = useAuth();
  const location = useLocation();
  const emailFromState = (location.state as any)?.email || '';
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<z.infer<typeof resendSchema>>({
    resolver: zodResolver(resendSchema),
    defaultValues: {
      email: emailFromState || user?.email || '',
    },
  });

  const handleResendVerification = async (data: z.infer<typeof resendSchema>) => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call an API endpoint to resend the verification email
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox for the verification link.",
      });
      
    } catch (error: any) {
      toast({
        title: "Failed to Send Verification Email",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Verify Your Email">
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <MailCheck className="w-8 h-8 text-primary" />
        </div>
        <p className="text-center text-gray-600 max-w-sm">
          We've sent you a verification email. Please check your inbox and click on the verification link to activate your account.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleResendVerification)} className="space-y-6">
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

          <div className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Resend Verification Email"}
            </Button>
            
            <Link to="/login">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
              >
                Back to Login
              </Button>
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
};

export default VerifyEmail;
