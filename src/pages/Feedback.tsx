
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AppLayout from '@/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";

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
          to: "admin@shiftflex.au",
          subject: "ShiftFlex Feedback Submission",
          html: `
            <h2>New feedback submission from ShiftFlex</h2>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <h3>What's working well?</h3>
            <p>${data.workingWell || "No response provided"}</p>
            <h3>What's not working well?</h3>
            <p>${data.notWorkingWell || "No response provided"}</p>
            <h3>What improvements would you like to see?</h3>
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

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Share Your Feedback</h1>
        <p className="mb-8 text-gray-600">
          We value your input! Please let us know what's working well, what could be improved, and any features you'd like to see in the future.
        </p>

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
                      <FormLabel>What improvements would you like to see?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share your ideas for new features or improvements" 
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
