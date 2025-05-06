
import { CalendarIcon, BellIcon, MailIcon, StarIcon } from "lucide-react";
import AppLayout from '@/layouts/AppLayout';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const FutureUpdates = () => {
  useAuthRedirect({ protectedRoute: true });
  const { toast } = useToast();
  const [subscribedFeatures, setSubscribedFeatures] = useState<string[]>([]);
  
  const toggleSubscribe = (featureId: string) => {
    setSubscribedFeatures((prev) => {
      if (prev.includes(featureId)) {
        toast({
          title: "Unsubscribed",
          description: "You'll no longer receive updates about this feature.",
        });
        return prev.filter(id => id !== featureId);
      } else {
        toast({
          title: "Subscribed",
          description: "You'll be notified when this feature launches!",
        });
        return [...prev, featureId];
      }
    });
  };

  const features = [
    {
      id: "calendar-integration",
      title: "Calendar Integration",
      description: "Sync your shifts with Google Calendar and Apple Calendar for seamless scheduling.",
      icon: <CalendarIcon className="h-6 w-6" />,
      progress: 65,
      eta: "Coming in Q3 2025",
    },
    {
      id: "email-notifications",
      title: "Email Notifications",
      description: "Get instant email alerts about new swap matches, approvals, and shift changes.",
      icon: <MailIcon className="h-6 w-6" />,
      progress: 80,
      eta: "Coming in Q2 2025",
    },
    {
      id: "sms-alerts",
      title: "SMS Notifications",
      description: "Never miss an important swap opportunity with real-time text message alerts.",
      icon: <BellIcon className="h-6 w-6" />,
      progress: 40,
      eta: "Coming in Q4 2025",
    },
    {
      id: "priority-swaps",
      title: "Priority Swaps",
      description: "Mark urgent shift swaps as high priority to get faster responses from colleagues.",
      icon: <StarIcon className="h-6 w-6" />,
      progress: 55,
      eta: "Coming in Q3 2025",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coming Soon</h1>
          <p className="text-muted-foreground mt-2">
            We're constantly working to improve ShiftFlex. Here's what's coming up next!
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Card key={feature.id} className="overflow-hidden">
              <CardHeader className="bg-secondary/40 flex flex-row items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-white rounded-md shadow-sm">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.eta}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p>{feature.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Development progress</span>
                    <span className="font-medium">{feature.progress}%</span>
                  </div>
                  <Progress value={feature.progress} />
                </div>
                
                <Button 
                  variant={subscribedFeatures.includes(feature.id) ? "secondary" : "default"}
                  className="w-full" 
                  onClick={() => toggleSubscribe(feature.id)}
                >
                  {subscribedFeatures.includes(feature.id) ? "Subscribed for Updates" : "Get Notified When Released"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card className="border-dashed border-2 bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3 py-8">
              <h3 className="text-xl font-semibold">Have Feature Suggestions?</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We love hearing from our users! Let us know what features would make ShiftFlex even better for you.
              </p>
              <Button 
                variant="outline" 
                onClick={() => toast({
                  title: "Thanks for your interest!",
                  description: "Feature suggestion form coming soon.",
                })}
              >
                Suggest a Feature
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default FutureUpdates;
