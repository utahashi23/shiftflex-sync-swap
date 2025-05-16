
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search } from 'lucide-react';
import { useLeaveSwapMatches } from '@/hooks/leave-blocks/useLeaveSwapMatches';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaveSwapMatch } from '@/types/leave-blocks';
import MatchTable from './MatchTable';
import MatchDetailsDialog from './MatchDetailsDialog';

interface MatchedLeaveSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedLeaveSwaps = ({ setRefreshTrigger }: MatchedLeaveSwapsProps) => {
  const [activeTab, setActiveTab] = useState('active');
  const [viewDetailsMatchId, setViewDetailsMatchId] = useState<string | null>(null);
  
  const {
    activeMatches,
    pastMatches,
    hasActiveRequests,
    isLoadingMatches,
    matchesError,
    findMatches,
    isFindingMatches,
    acceptMatch,
    isAcceptingMatch,
    finalizeMatch,
    isFinalizingMatch,
    cancelMatch,
    isCancellingMatch,
    refetchMatches
  } = useLeaveSwapMatches();
  
  const handleRefresh = () => {
    refetchMatches();
    if (setRefreshTrigger) {
      setRefreshTrigger(prev => prev + 1);
    }
  };
  
  const handleFindMatches = () => {
    findMatches();
    if (setRefreshTrigger) {
      setRefreshTrigger(prev => prev + 1);
    }
  };
  
  const handleViewDetails = (matchId: string) => {
    setViewDetailsMatchId(matchId);
  };
  
  const getMatchDetails = (): LeaveSwapMatch | null => {
    if (!viewDetailsMatchId) return null;
    return [...activeMatches, ...pastMatches].find(
      match => match.match_id === viewDetailsMatchId
    ) || null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <CardTitle>Leave Swap Matches</CardTitle>
              <CardDescription>
                View and manage your matched leave block swaps
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFindMatches}
                disabled={isFindingMatches || !hasActiveRequests}
              >
                <Search className={`h-4 w-4 mr-2 ${isFindingMatches ? 'animate-spin' : ''}`} />
                Find Matches
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoadingMatches}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMatches ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {matchesError ? (
            <Alert variant="destructive">
              <AlertTitle>Error loading matches</AlertTitle>
              <AlertDescription>
                {matchesError.message}
              </AlertDescription>
            </Alert>
          ) : !hasActiveRequests ? (
            <Alert>
              <AlertTitle>No Active Swap Requests</AlertTitle>
              <AlertDescription>
                You need to create a leave swap request before you can find matches. 
                Go to the "Request Swap" tab to create a new swap request.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="active">Active Matches</TabsTrigger>
                <TabsTrigger value="past">Past Matches</TabsTrigger>
              </TabsList>
              
              <TabsContent value="active">
                {isLoadingMatches ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <MatchTable 
                    matches={activeMatches}
                    onViewDetails={handleViewDetails}
                    onAccept={(matchId) => acceptMatch({ matchId })}
                    onFinalize={(matchId) => finalizeMatch({ matchId })}
                    onCancel={(matchId) => cancelMatch({ matchId })}
                    isAcceptingMatch={isAcceptingMatch}
                    isFinalizingMatch={isFinalizingMatch}
                    isCancellingMatch={isCancellingMatch}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="past">
                {isLoadingMatches ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <MatchTable 
                    matches={pastMatches}
                    isPast={true}
                    onViewDetails={handleViewDetails}
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      
      <MatchDetailsDialog
        open={viewDetailsMatchId !== null}
        onOpenChange={(open) => {
          if (!open) setViewDetailsMatchId(null);
        }}
        match={getMatchDetails()}
      />
    </div>
  );
};

export default MatchedLeaveSwaps;
