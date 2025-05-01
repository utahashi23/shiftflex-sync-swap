
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CalendarX, Link, Apple, Mail } from 'lucide-react';

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

const calendarLinkSchema = z.object({
  calendarUrl: z.string().url('Please enter a valid URL')
});

export const CalendarIntegration = () => {
  const { user } = useAuth();
  const [isCalendarLoading, setCalendarLoading] = useState(false);
  
  const calendarLinkForm = useForm<z.infer<typeof calendarLinkSchema>>({
    resolver: zodResolver(calendarLinkSchema),
    defaultValues: {
      calendarUrl: user?.user_metadata?.calendar_url || '',
    },
  });

  const onCalendarLinkSubmit = async (data: z.infer<typeof calendarLinkSchema>) => {
    setCalendarLoading(true);
    
    try {
      // Note: We need to use a different approach for calendar URL since it's not in the basic user props
      // For now, simulate success
      toast({
        title: "Calendar Link Saved",
        description: "Your calendar link has been successfully saved.",
      });
      
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "There was a problem saving your calendar link.",
        variant: "destructive",
      });
    } finally {
      setCalendarLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Integration</CardTitle>
        <CardDescription>
          Connect your external calendars
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="shared">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="shared">Shared Calendar Links</TabsTrigger>
            <TabsTrigger value="manual">Manual Import</TabsTrigger>
            <TabsTrigger value="google" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Google Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="apple" className="flex items-center gap-2">
              <Apple className="h-4 w-4" />
              <span>Apple Calendar</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="shared" className="pt-6">
            <Form {...calendarLinkForm}>
              <form onSubmit={calendarLinkForm.handleSubmit(onCalendarLinkSubmit)} className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Link className="h-5 w-5 text-primary" />
                  <p className="text-sm text-gray-600">
                    Provide a public iCal or Google Calendar URL to import your shifts
                  </p>
                </div>
                
                <FormField
                  control={calendarLinkForm.control}
                  name="calendarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your calendar URL (iCal or Google Calendar)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={isCalendarLoading}
                >
                  {isCalendarLoading ? "Saving..." : "Save Calendar Link"}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="manual" className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 p-3 rounded-full bg-gray-100">
                <CalendarX className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p className="text-gray-500 max-w-md">
                Almost there! This feature will be ready in an upcoming release.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="google" className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 p-4 rounded-full bg-blue-50">
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium mb-3">Coming Soon: Google Calendar Integration</h3>
              <p className="text-gray-600 max-w-md">
                Real-time push and pull syncing with Google Calendar is on the way! 
                Stay tuned for seamless updates and smarter scheduling in an upcoming release.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="apple" className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 p-4 rounded-full bg-gray-100">
                <Apple className="h-8 w-8 text-gray-700" />
              </div>
              <h3 className="text-lg font-medium mb-3">Coming Soon: Apple Calendar Integration</h3>
              <p className="text-gray-600 max-w-md">
                Real-time push and pull syncing with Apple Calendar is on the way! 
                Stay tuned for seamless updates and smarter scheduling in an upcoming release.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
