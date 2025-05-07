import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const EmailPreferences = () => {
  const [dailyDigest, setDailyDigest] = useState(true);
  const [swapNotifications, setSwapNotifications] = useState(true);
  const [rosterUpdates, setRosterUpdates] = useState(false); // Changed from true to false
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [frequency, setFrequency] = useState([2]); // 0=none, 1=low, 2=normal, 3=high
  
  const frequencyLabel = () => {
    switch (frequency[0]) {
      case 0: return "None";
      case 1: return "Low";
      case 2: return "Normal";
      case 3: return "High";
      default: return "Normal";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Email Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Manage how and when you receive email notifications
        </p>
      </div>
      <Separator />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-digest">Daily digest</Label>
            <div className="text-sm text-muted-foreground">
              Receive a summary of important updates each day
            </div>
          </div>
          <Switch id="daily-digest" checked={dailyDigest} onCheckedChange={setDailyDigest} />
        </div>
        
        <Separator />
        
        <div>
          <h4 className="text-sm font-medium mb-3">Notification types</h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox id="swap-notifications" checked={swapNotifications} onCheckedChange={(checked) => setSwapNotifications(checked as boolean)} />
              <div className="grid gap-1.5">
                <Label htmlFor="swap-notifications" className="text-sm font-medium">
                  Shift swap updates 
                  <Badge className="ml-2 bg-primary/20 text-primary hover:bg-primary/30" variant="outline">Recommended</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when your shift swap requests are matched or approved
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox id="roster-updates" checked={rosterUpdates} onCheckedChange={(checked) => setRosterUpdates(checked as boolean)} />
              <div className="grid gap-1.5">
                <Label htmlFor="roster-updates" className="text-sm font-medium">Roster changes</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when the roster is updated or your shifts change
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox id="urgent-only" checked={urgentOnly} onCheckedChange={(checked) => setUrgentOnly(checked as boolean)} />
              <div className="grid gap-1.5">
                <Label htmlFor="urgent-only" className="text-sm font-medium">Urgent notifications only</Label>
                <p className="text-sm text-muted-foreground">
                  Only receive emails for time-sensitive matters
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="frequency">Email frequency</Label>
            <span className="text-sm font-medium">{frequencyLabel()}</span>
          </div>
          <Slider 
            id="frequency" 
            min={0} 
            max={3} 
            step={1} 
            value={frequency} 
            onValueChange={setFrequency} 
          />
          <p className="text-xs text-muted-foreground pt-1">
            Adjust how often you receive non-urgent email notifications
          </p>
        </div>
      </div>
    </div>
  );
};
