
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/useAuth';
import { LogIn, UserPlus } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters."
  }),
  email: z.string().email({
    message: "Please enter a valid email address."
  }),
  workingWell: z.string().min(5, {
    message: "Please provide at least 5 characters."
  }).optional(),
  notWorkingWell: z.string().min(5, {
    message: "Please provide at least 5 characters."
  }).optional(),
  improvement: z.string().min(5, {
    message: "Please provide at least 5 characters."
  })
});

type FormValues = z.infer<typeof formSchema>;

const Feedback = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      workingWell: "",
      notWorkingWell: "",
      improvement: ""
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Use Supabase functions.invoke instead of direct fetch
      const { error } = await supabase.functions.invoke('send_email', {
        body: {
          to: "njalasankhulani@gmail.com",
          subject: "ShiftFlex Feedback Submission",
          html: `
            <h2>New feedback submission from ShiftFlex</h2>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <h3>What's working well?</h3>
            <p>${data.workingWell || "No response provided"}</p>
            <h3>What's not working well?</h3>
            <p>${data.notWorkingWell || "No response provided"}</p>
            <h3>What features would you like to see?</h3>
            <p>${data.improvement}</p>
          `
        }
      });

      if (error) {
        throw new Error(`Failed to send feedback: ${error.message}`);
      }
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
      
      form.reset();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "There was a problem submitting your feedback. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login', { state: { returnUrl: '/feedback' } });
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Share Your Feedback</h1>
        <p className="mb-8 text-gray-600">
          We value your input! Please let us know what's working well, what could be improved, and any features you'd like to see in the future.
        </p>

        {!user && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <h3 className="text-xl font-semibold mb-3">Join the ShiftFlex Community</h3>
                <p className="text-gray-600 mb-4">
                  Register to actively participate and provide valuable feedback that helps shape the future of ShiftFlex.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button onClick={handleLoginClick} variant="outline">
                    <LogIn className="mr-2" />
                    Log in
                  </Button>
                  <Button onClick={handleRegisterClick}>
                    <UserPlus className="mr-2" />
                    Register
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Feedback Form</CardTitle>
            <CardDescription>
              Help us make ShiftFlex better for you and your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Your email address" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="workingWell"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What's working well?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us what features or aspects of ShiftFlex you like" 
                          {...field} 
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Share what you find most useful about the platform
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notWorkingWell"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What's not working well?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about any issues or frustrations you're experiencing" 
                          {...field} 
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Let us know about any pain points or challenges
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="improvement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What features would you like to see?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share your ideas for new features" 
                          {...field} 
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormDescription>
                        What would make ShiftFlex more valuable to you?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Feedback;
