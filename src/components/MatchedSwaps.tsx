
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
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SwapMatch } from '@/hooks/useSwapMatches';
import { getShiftType } from '@/utils/shiftUtils';
import { SimpleMatchTester } from './testing/SimpleMatchTester'; // Changed to named import
import { useSwapMatcher } from '@/hooks/swap-matching/useSwapMatcher';
import { SwapMatchDebug } from './matched-swaps/SwapMatchDebug';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface MatchedSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedSwapsComponent = ({ setRefreshTrigger }: MatchedSwapsProps) => {
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<SwapMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [showTestingTools, setShowTestingTools] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ 
    isOpen: boolean;
    matchId: string | null;
  }>({
    isOpen: false,
    matchId: null
  });
  
  const { user, isAdmin } = useAuth();
  const { findSwapMatches, isProcessing } = useSwapMatcher();

  // Process matches data from API response
  const processMatchesData = (matchesData: any[]) => {
    if (!matchesData || !Array.isArray(matchesData) || matchesData.length === 0) {
      return [];
    }
    
    // Process and deduplicate the matches data
    const uniqueMatches = Array.from(
      new Map(matchesData.map((match: any) => [match.match_id, match])).values()
    );
    
    // Process the data
    return uniqueMatches.map((match: any) => {
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
  };

  // Fetch matches data using findSwapMatches directly
  const fetchMatches = async () => {
    if (!user || !user.id) return;
    
    setIsLoading(true);
    
    try {
      console.log('Finding matches for user:', user.id);
      
      // Directly use findSwapMatches to find and retrieve matches
      const matchesData = await findSwapMatches(user.id, true, true, true, true);
      console.log('Raw match data from function:', matchesData);
      
      // Process the matches data
      const formattedMatches = processMatchesData(matchesData);
      
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
      
      // If we've found matches, update parent tabs if needed
      if (activeMatches.length > 0 && setRefreshTrigger) {
        setRefreshTrigger(prevVal => prevVal + 1);
        if (activeTab !== 'active') {
          setActiveTab('active');
        }
      }
      
      // Show toast message about the results
      if (activeMatches.length > 0) {
        toast({
          title: "Matches found!",
          description: `Found ${activeMatches.length} potential swap matches.`,
        });
      } else {
        toast({
          title: "No matches found",
          description: "No potential swap matches were found at this time.",
        });
      }
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

  return (
    <div className="space-y-6">
      {/* Collapsible Swap Match Testing section */}
      <Collapsible
        open={showTestingTools}
        onOpenChange={setShowTestingTools}
        className="border border-amber-300 rounded-lg bg-amber-50 overflow-hidden"
      >
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-bold text-amber-700">Swap Match Testing</h2>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="border-amber-400 hover:bg-amber-100">
              {showTestingTools ? (
                <>Hide Testing Tools <ChevronUp className="ml-1 h-4 w-4" /></>
              ) : (
                <>Show Testing Tools <ChevronDown className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          <div className="p-4 pt-0">
            <p className="text-sm text-amber-600 mb-4">
              Test and create matches between swap requests. Created matches will appear in the Active Matches tab.
            </p>
            <SimpleMatchTester onMatchCreated={fetchMatches} />
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="active">Active Matches</TabsTrigger>
            <TabsTrigger value="past">Past Swaps</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button 
              onClick={fetchMatches}
              disabled={isLoading || isProcessing}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isProcessing ? 'animate-spin' : ''}`} />
              {isLoading || isProcessing ? 'Finding Matches...' : 'Refresh Matches'}
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
