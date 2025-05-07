
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from '@/hooks/useAuth';

interface DebugPanelProps {
  debugData: any;
  onRefresh: () => void;
  isLoading: boolean;
}

export const DebugPanel = ({ debugData, onRefresh, isLoading }: DebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  
  return (
    <Card className="mt-8 border-red-300">
      <CardHeader className="bg-red-50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-red-700">Debug Panel</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Database Directly
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="mb-2">Current user ID: <code className="bg-gray-100 px-2 py-1 rounded">{user?.id || 'Not logged in'}</code></p>
        
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between mb-2">
              Database Debug Data
              <span>{isOpen ? '▼' : '▶'}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <div className="border rounded p-3">
              <h3 className="font-medium mb-1">Direct Database Records:</h3>
              <h4 className="text-sm font-medium mt-2">Potential Matches:</h4>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(debugData.potentialMatches || [], null, 2)}
              </pre>
              
              <h4 className="text-sm font-medium mt-2">User Requests:</h4>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(debugData.requests || [], null, 2)}
              </pre>
              
              <h4 className="text-sm font-medium mt-2">Matches Per Request:</h4>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(debugData.matchesPerRequest || [], null, 2)}
              </pre>
            </div>
            
            <div className="border rounded p-3">
              <h3 className="font-medium mb-1">API Response Data:</h3>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(debugData.rawData || [], null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default DebugPanel;
