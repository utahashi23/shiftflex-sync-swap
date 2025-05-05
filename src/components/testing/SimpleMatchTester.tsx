
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { getShiftType } from '@/utils/shiftUtils';

// Define the MatchTestResult type
interface MatchTestResult {
  request1Id: string;
  request2Id: string;
  request1Shift: any;
  request2Shift: any;
  request1User: any;
  request2User: any;
}

interface SimpleMatchTesterProps {
  onMatchCreated?: () => void;
}

// Create the swap match card function
const createSwapMatchCard = (match: MatchTestResult) => {
  const shift1 = match.request1Shift;
  const shift2 = match.request2Shift;
  
  if (!shift1 || !shift2) return null;
  
  const user1 = match.request1User;
  const user2 = match.request2User;
  
  return {
    id: `potential-${match.request1Id}-${match.request2Id}`,
    status: 'potential',
    myShift: {
      id: shift1.id,
      date: shift1.date,
      startTime: shift1.start_time,
      endTime: shift1.end_time,
      truckName: shift1.truck_name,
      type: getShiftType(shift1.start_time),
      colleagueType: shift1.colleague_type || 'Unknown'
    },
    otherShift: {
      id: shift2.id,
      date: shift2.date,
      startTime: shift2.start_time,
      endTime: shift2.end_time,
      truckName: shift2.truck_name,
      type: getShiftType(shift2.start_time),
      userId: shift2.user_id,
      userName: user2 ? `${user2.first_name} ${user2.last_name}` : 'Unknown User',
      colleagueType: shift2.colleague_type || 'Unknown'
    },
    myRequestId: match.request1Id,
    otherRequestId: match.request2Id,
    createdAt: new Date().toISOString()
  };
};

// Export as a named export instead of default
export const SimpleMatchTester = ({ onMatchCreated }: SimpleMatchTesterProps) => {
  const [request1Id, setRequest1Id] = useState('');
  const [request2Id, setRequest2Id] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<MatchTestResult | null>(null);

  const handleTestMatch = async () => {
    if (!request1Id || !request2Id) {
      toast({
        title: "Missing request IDs",
        description: "Please enter both request IDs to test a match",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // Get request 1 details
      const { data: request1 } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('id', request1Id)
        .single();
        
      if (!request1) throw new Error('Request 1 not found');
      
      // Get request 1 shift
      const { data: shift1 } = await supabase.rpc('get_shift_by_id', { 
        shift_id: request1.requester_shift_id 
      });
      
      if (!shift1 || shift1.length === 0) throw new Error('Request 1 shift not found');
      
      // Get request 2 details
      const { data: request2 } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('id', request2Id)
        .single();
        
      if (!request2) throw new Error('Request 2 not found');
      
      // Get request 2 shift
      const { data: shift2 } = await supabase.rpc('get_shift_by_id', { 
        shift_id: request2.requester_shift_id 
      });
      
      if (!shift2 || shift2.length === 0) throw new Error('Request 2 shift not found');
      
      // Get user details
      const { data: user1 } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', request1.requester_id)
        .single();
        
      const { data: user2 } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', request2.requester_id)
        .single();
      
      // Set test result
      setTestResult({
        request1Id: request1.id,
        request2Id: request2.id,
        request1Shift: shift1[0],
        request2Shift: shift2[0],
        request1User: user1,
        request2User: user2
      });
      
      toast({
        title: "Match test completed",
        description: "Both requests and shifts were found",
      });
    } catch (error: any) {
      console.error('Error testing match:', error);
      toast({
        title: "Error testing match",
        description: error.message || "Could not complete the match test",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!testResult) return;
    
    setIsLoading(true);
    
    try {
      // Create the match in the database - using shift_swap_potential_matches table
      // since this is what our system actually uses for matches now
      const { data, error } = await supabase
        .from('shift_swap_potential_matches')
        .insert({
          requester_request_id: testResult.request1Id,
          acceptor_request_id: testResult.request2Id,
          requester_shift_id: testResult.request1Shift.id,
          acceptor_shift_id: testResult.request2Shift.id,
          match_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        })
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Match created successfully",
        description: "The swap match has been created",
      });
      
      // Call the callback if provided
      if (onMatchCreated) {
        onMatchCreated();
      }
      
      // Reset the form
      setRequest1Id('');
      setRequest2Id('');
      setTestResult(null);
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast({
        title: "Error creating match",
        description: error.message || "Could not create the match",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-amber-300 bg-amber-50/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-800">Create Test Match</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="request1">Request ID 1</Label>
              <Input
                id="request1"
                value={request1Id}
                onChange={(e) => setRequest1Id(e.target.value)}
                placeholder="e.g. 12345678-1234-5678-1234-567812345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request2">Request ID 2</Label>
              <Input
                id="request2"
                value={request2Id}
                onChange={(e) => setRequest2Id(e.target.value)}
                placeholder="e.g. 12345678-1234-5678-1234-567812345678"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isLoading || !request1Id || !request2Id}
              onClick={handleTestMatch}
            >
              Test Match
            </Button>
            <Button
              type="button"
              disabled={isLoading || !testResult}
              onClick={handleCreateMatch}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Create Match
            </Button>
          </div>
          
          {testResult && (
            <div className="mt-4 p-3 border border-amber-300 rounded-md bg-amber-100">
              <h4 className="font-medium mb-2 text-amber-800">Match Test Result</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Request 1 Shift</p>
                  <p>Date: {testResult.request1Shift.date}</p>
                  <p>Time: {testResult.request1Shift.start_time} - {testResult.request1Shift.end_time}</p>
                  <p>User: {testResult.request1User?.first_name} {testResult.request1User?.last_name}</p>
                  <p>Colleague Type: {testResult.request1Shift.colleague_type || 'Unknown'}</p>
                </div>
                <div>
                  <p className="font-medium">Request 2 Shift</p>
                  <p>Date: {testResult.request2Shift.date}</p>
                  <p>Time: {testResult.request2Shift.start_time} - {testResult.request2Shift.end_time}</p>
                  <p>User: {testResult.request2User?.first_name} {testResult.request2User?.last_name}</p>
                  <p>Colleague Type: {testResult.request2Shift.colleague_type || 'Unknown'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Make the createSwapMatchCard function accessible for testing
SimpleMatchTester.prototype.createSwapMatchCard = createSwapMatchCard;
