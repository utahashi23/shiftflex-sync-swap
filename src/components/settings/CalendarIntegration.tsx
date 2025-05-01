
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AppleIcon, MailIcon } from 'lucide-react';

export const CalendarIntegration = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Calendar Integration</h3>
        <p className="text-sm text-muted-foreground">
          Connect your shifts with external calendar services
        </p>
      </div>
      <Separator />
      
      <Tabs defaultValue="google" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="google">Google Calendar</TabsTrigger>
          <TabsTrigger value="apple">Apple Calendar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="google" className="space-y-4 py-4">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white p-2 shadow-md">
              <MailIcon className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h4 className="font-medium">Coming Soon: Google Calendar Integration</h4>
              <p className="text-sm text-muted-foreground">
                Real-time push and pull syncing with Google Calendar is on the way! 
                Stay tuned for seamless updates and smarter scheduling in an upcoming release.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="apple" className="space-y-4 py-4">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-white p-2 shadow-md">
              <AppleIcon className="h-8 w-8" />
            </div>
            <div>
              <h4 className="font-medium">Coming Soon: Apple Calendar Integration</h4>
              <p className="text-sm text-muted-foreground">
                Real-time push and pull syncing with Apple Calendar is on the way! 
                Stay tuned for seamless updates and smarter scheduling in an upcoming release.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
