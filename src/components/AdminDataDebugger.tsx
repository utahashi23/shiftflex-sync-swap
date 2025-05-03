
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Shield, Database, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { Badge } from "@/components/ui/badge";
import {
  testAdminRoleVerification,
  testAdminSwapRequestAccess,
  testAdminShiftsAccess,
  testAdminPreferredDatesAccess,
  testEdgeFunctionAccess
} from "@/utils/admin-debug-utils";

export default function AdminDataDebugger() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('admin');
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const result = await testFn();
      setResults(prev => ({ ...prev, [testName]: result }));
      
      if (result.success) {
        toast({
          title: "Test Successful",
          description: `${testName} test completed successfully`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.error || `${testName} test failed`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error(`Error in ${testName} test:`, error);
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error.message || 'Unknown error'
        }
      }));
      toast({
        title: "Test Error",
        description: `Error running ${testName} test: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  return (
    <Card className="border-2 border-amber-400 bg-amber-50 shadow-lg">
      <CardHeader className="bg-amber-100 border-b border-amber-300">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Shield className="h-5 w-5" /> Admin Data Access Debugger
          </CardTitle>
          <Badge 
            variant={isAdmin ? "success" : "destructive"}
            className={isAdmin ? "bg-green-100 hover:bg-green-200 text-green-800 border border-green-300" : ""}
          >
            {isAdmin ? "Admin Access" : "No Admin Access"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="admin">Admin Status</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
            <TabsTrigger value="swaps">Swap Requests</TabsTrigger>
            <TabsTrigger value="edge">Edge Functions</TabsTrigger>
          </TabsList>
          
          {/* Admin Status Tab */}
          <TabsContent value="admin" className="space-y-4">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium">Current User</h3>
                <p className="text-xs text-gray-500 mt-1">{user?.id || 'Not logged in'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('adminRole', testAdminRoleVerification)}
                disabled={isLoading['adminRole']}
              >
                {isLoading['adminRole'] ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verify Admin Status
              </Button>
            </div>
            
            {results['adminRole'] && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                  <h4 className="font-medium">Admin Role Check Results</h4>
                  {results['adminRole'].success ? (
                    <Badge variant={results['adminRole'].isAdmin ? "outline" : "secondary"}>
                      {results['adminRole'].isAdmin ? "Admin ✅" : "Not Admin ❌"}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Check Failed</Badge>
                  )}
                </div>
                <pre className="text-xs p-3 max-h-96 overflow-auto">
                  {JSON.stringify(results['adminRole']?.data || results['adminRole'], null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>
          
          {/* Shifts Tab */}
          <TabsContent value="shifts" className="space-y-4">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium">Shifts Data Access</h3>
                <p className="text-xs text-gray-500 mt-1">Test admin access to the shifts table</p>
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTest('shifts', testAdminShiftsAccess)}
                  disabled={isLoading['shifts']}
                >
                  {isLoading['shifts'] ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  Test Shifts Access
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTest('preferredDates', testAdminPreferredDatesAccess)}
                  disabled={isLoading['preferredDates']}
                >
                  {isLoading['preferredDates'] ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  Test Preferred Dates
                </Button>
              </div>
            </div>
            
            {results['shifts'] && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                  <h4 className="font-medium">Shifts Access Results</h4>
                  {results['shifts'].success ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {results['shifts'].count} shifts found
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Access Failed
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <div className="mb-2 text-xs font-medium">
                    Access Method: <span className="font-bold">{results['shifts'].method}</span>
                  </div>
                  {results['shifts'].error && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      {results['shifts'].error}
                    </div>
                  )}
                </div>
                <pre className="text-xs p-3 max-h-72 overflow-auto border-t">
                  {JSON.stringify(results['shifts']?.data?.slice(0, 5) || results['shifts'], null, 2)}
                  {(results['shifts']?.data?.length || 0) > 5 && (
                    <div className="mt-2 text-gray-500">
                      ... and {results['shifts'].data.length - 5} more items
                    </div>
                  )}
                </pre>
              </div>
            )}
            
            {results['preferredDates'] && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                  <h4 className="font-medium">Preferred Dates Access Results</h4>
                  {results['preferredDates'].success ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {results['preferredDates'].count} dates found
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Access Failed
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <div className="mb-2 text-xs font-medium">
                    Access Method: <span className="font-bold">{results['preferredDates'].method}</span>
                  </div>
                  {results['preferredDates'].error && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      {results['preferredDates'].error}
                    </div>
                  )}
                </div>
                <pre className="text-xs p-3 max-h-72 overflow-auto border-t">
                  {JSON.stringify(results['preferredDates']?.data?.slice(0, 5) || results['preferredDates'], null, 2)}
                  {(results['preferredDates']?.data?.length || 0) > 5 && (
                    <div className="mt-2 text-gray-500">
                      ... and {results['preferredDates'].data.length - 5} more items
                    </div>
                  )}
                </pre>
              </div>
            )}
          </TabsContent>
          
          {/* Swap Requests Tab */}
          <TabsContent value="swaps" className="space-y-4">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium">Swap Requests Data Access</h3>
                <p className="text-xs text-gray-500 mt-1">Test admin access to swap request data</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('swapRequests', testAdminSwapRequestAccess)}
                disabled={isLoading['swapRequests']}
              >
                {isLoading['swapRequests'] ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Test Swap Requests Access
              </Button>
            </div>
            
            {results['swapRequests'] && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                  <h4 className="font-medium">Swap Requests Access Results</h4>
                  {results['swapRequests'].success ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {results['swapRequests'].count} requests found
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Access Failed
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <div className="mb-2 text-xs font-medium">
                    Access Method: <span className="font-bold">{results['swapRequests'].method}</span>
                  </div>
                  {results['swapRequests'].error && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      {results['swapRequests'].error}
                    </div>
                  )}
                </div>
                <pre className="text-xs p-3 max-h-72 overflow-auto border-t">
                  {JSON.stringify(results['swapRequests']?.data?.slice(0, 5) || results['swapRequests'], null, 2)}
                  {(results['swapRequests']?.data?.length || 0) > 5 && (
                    <div className="mt-2 text-gray-500">
                      ... and {results['swapRequests'].data.length - 5} more items
                    </div>
                  )}
                </pre>
              </div>
            )}
          </TabsContent>
          
          {/* Edge Functions Tab */}
          <TabsContent value="edge" className="space-y-4">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium">Edge Function Access</h3>
                <p className="text-xs text-gray-500 mt-1">Test access via Supabase edge functions</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest('edgeFunction', testEdgeFunctionAccess)}
                disabled={isLoading['edgeFunction']}
              >
                {isLoading['edgeFunction'] ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Edge Function
              </Button>
            </div>
            
            {results['edgeFunction'] && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                  <h4 className="font-medium">Edge Function Access Results</h4>
                  {results['edgeFunction'].success ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Failed
                    </Badge>
                  )}
                </div>
                {results['edgeFunction'].error && (
                  <div className="p-3">
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      {results['edgeFunction'].error}
                    </div>
                  </div>
                )}
                <pre className="text-xs p-3 max-h-96 overflow-auto border-t">
                  {JSON.stringify(results['edgeFunction']?.data?.slice(0, 3) || results['edgeFunction'], null, 2)}
                  {Array.isArray(results['edgeFunction']?.data) && results['edgeFunction'].data.length > 3 && (
                    <div className="mt-2 text-gray-500">
                      ... and {results['edgeFunction'].data.length - 3} more items
                    </div>
                  )}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-amber-100 border-t border-amber-300 flex justify-between">
        <p className="text-xs text-amber-800">
          This debugging tool helps identify permissions issues with data access.
        </p>
        <p className="text-xs text-amber-700 font-bold">
          User ID: {user?.id?.substring(0, 8)}...
        </p>
      </CardFooter>
    </Card>
  );
}
