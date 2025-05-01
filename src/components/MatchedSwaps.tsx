
import { useState, useEffect } from 'react';
import { SwapConfirmDialog } from './matched-swaps/SwapConfirmDialog';
import { SwapTabContent } from './matched-swaps/SwapTabContent';
import { Button } from "./ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapMatch } from '@/hooks/useSwapMatches';
import { getShiftType } from '@/utils/shiftUtils';

interface MatchedSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedSwapsComponent = ({ setRefreshTrigger }: MatchedSwapsProps) => {
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<SwapMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [confirmDialog, setConfirmDialog] = useState<{ 
    isOpen: boolean;
    matchId: string | null;
  }>({
    isOpen: false,
    matchId: null
  });
  
  const { user } = useAuth();

  // Fetch matches data directly
  const fetchMatches = async () => {
    if (!user || !user.id) return;
    
    setIsLoading(true);
    
    try {
      console.log('Fetching matches for user:', user.id);
      
      // Call the get_user_matches function
      const { data: matchesData, error: matchesError } = await supabase.functions.invoke('get_user_matches', {
        body: { user_id: user.id }
      });
        
      if (matchesError) throw matchesError;
      
      console.log('Raw match data from function:', matchesData);
      
      if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
        setMatches([]);
        setPastMatches([]);
        setIsLoading(false);
        return;
      }
      
      // Process and deduplicate the matches data
      const uniqueMatches = Array.from(
        new Map(matchesData.map((match: any) => [match.match_id, match])).values()
      );
      
      // Process the data
      const formattedMatches = uniqueMatches.map((match: any) => {
        return {
          id: match.match_id,
          status: match.match_status,
          myShift: {
            id: match.my_shift_id,
            date: match.my_shift_date,
            startTime: match.my_shift_start_time,
            endTime: match.my_shift_end_time,
            truckName: match.my_shift_truck,
            type: getShiftType(match.my_shift_start_time)
          },
          otherShift: {
            id: match.other_shift_id,
            date: match.other_shift_date,
            startTime: match.other_shift_start_time,
            endTime: match.other_shift_end_time,
            truckName: match.other_shift_truck,
            type: getShiftType(match.other_shift_start_time),
            userId: match.other_user_id,
            userName: match.other_user_name || 'Unknown User'
          },
          myRequestId: match.my_request_id,
          otherRequestId: match.other_request_id,
          createdAt: match.created_at
        };
      });
      
      // Separate active and past matches
      const activeMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'pending' || match.status === 'accepted'
      );
      
      const completedMatches = formattedMatches.filter((match: SwapMatch) => 
        match.status === 'completed'
      );
      
      console.log(`Processed ${activeMatches.length} active matches and ${completedMatches.length} past matches`);
      
      setMatches(activeMatches);
      setPastMatches(completedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Failed to load matches",
        description: "Could not load your swap matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Accept a swap match
  const acceptMatch = async (matchId: string) => {
    if (!user || !matchId) return false;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('accept_swap_match', {
        body: { match_id: matchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Swap Accepted",
        description: "You have successfully accepted the swap.",
      });
      
      // Refresh matches after accepting
      await fetchMatches();
      
      return true;
    } catch (error) {
      console.error('Error accepting swap:', error);
      toast({
        title: "Failed to accept swap",
        description: "There was a problem accepting the swap. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
      return false;
    }
  };

  // Handle accept button click
  const handleAcceptClick = (matchId: string) => {
    setConfirmDialog({ isOpen: true, matchId });
  };

  // Handle confirm accept in dialog
  const handleAcceptSwap = async () => {
    if (!confirmDialog.matchId) return;
    
    const success = await acceptMatch(confirmDialog.matchId);
    
    setConfirmDialog({ isOpen: false, matchId: null });
    
    // If passed from parent, update the parent refresh trigger to update all tabs
    if (success && setRefreshTrigger) {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  // Log debug info
  console.log('Matched swaps component:', {
    matchCount: matches.length,
    pastMatchCount: pastMatches.length,
    isLoading,
    hasError: false
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="active">Active Matches</TabsTrigger>
            <TabsTrigger value="past">Past Swaps</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button 
              onClick={fetchMatches}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Finding Matches...' : 'Refresh Matches'}
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-1" /> Filter
            </Button>
          </div>
        </div>
        
        <TabsContent value="active">
          <SwapTabContent 
            swaps={matches} 
            onAcceptSwap={handleAcceptClick}
          />
        </TabsContent>
        
        <TabsContent value="past">
          <SwapTabContent 
            swaps={pastMatches} 
            isPast={true}
          />
        </TabsContent>
      </Tabs>

      <SwapConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfirmDialog({ isOpen: false, matchId: null });
          }
        }}
        onConfirm={handleAcceptSwap}
        isLoading={isLoading}
      />
    </div>
  );
};

export default MatchedSwapsComponent;
