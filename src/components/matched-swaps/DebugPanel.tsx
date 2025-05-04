
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { SwapMatch } from "@/hooks/useSwapMatches";

interface DebugPanelProps {
  matches: SwapMatch[];
  rawData: any;
  error: Error | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export function DebugPanel({ matches, rawData, error, onRefresh, isLoading }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "Debug data has been copied to your clipboard",
    });
  };

  return (
    <Card className="mt-6 border-2 border-amber-300 bg-amber-50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-amber-800 text-lg flex items-center">
            <div className="h-2 w-2 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
            Match Debugging
          </CardTitle>
          <Switch
            checked={isExpanded}
            onCheckedChange={setIsExpanded}
            id="debug-mode"
          />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium">Match Count</div>
                <div className="text-2xl font-bold">{matches.length}</div>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Reload Data
              </Button>
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 rounded border border-red-300 text-red-800">
                <div className="font-semibold mb-1">Error:</div>
                <div className="text-sm">{error.message}</div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Show Raw API Data</div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRawData(!showRawData)}
              >
                {showRawData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {showRawData && rawData && (
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => copyToClipboard(rawData)}
                >
                  Copy
                </Button>
                <pre className="text-xs p-3 bg-gray-100 rounded border max-h-64 overflow-auto">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            )}

            {matches.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">First Match Summary</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded border">
                    <div className="font-semibold">My Shift</div>
                    <div>Date: {matches[0].myShift.date}</div>
                    <div>Time: {matches[0].myShift.startTime} - {matches[0].myShift.endTime}</div>
                    <div>Truck: {matches[0].myShift.truckName || 'Not specified'}</div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="font-semibold">Other Shift</div>
                    <div>Date: {matches[0].otherShift.date}</div>
                    <div>Time: {matches[0].otherShift.startTime} - {matches[0].otherShift.endTime}</div>
                    <div>Truck: {matches[0].otherShift.truckName || 'Not specified'}</div>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-white rounded border text-xs">
                  <div className="font-semibold">Match Details</div>
                  <div>ID: {matches[0].id}</div>
                  <div>Status: {matches[0].status}</div>
                  <div>Created: {new Date(matches[0].createdAt).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
