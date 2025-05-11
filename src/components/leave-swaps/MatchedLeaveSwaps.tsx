
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import custom components
import ConnectionError from './connection-states/ConnectionError';
import ErrorMessage from './connection-states/ErrorMessage';
import StatusBadge from './match-items/StatusBadge';
import MatchActions from './match-items/MatchActions';
import MatchDetailsDialog from './match-items/MatchDetailsDialog';

// Import hook
import { useLeaveSwapMatches } from '@/hooks/leave-blocks/useLeaveSwapMatches';

interface MatchedLeaveSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedLeaveSwaps: React.FC<MatchedLeaveSwapsProps> = ({ setRefreshTrigger }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const {
    activeMatches,
    pastMatches,
    isLoadingMatches,
    matchesError,
    connectionError,
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
  
  // Format date helper function
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  // Handle actions
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
  
  const handleAcceptMatch = (matchId: string) => {
    acceptMatch({ matchId });
  };
  
  const handleFinalizeMatch = (matchId: string) => {
    finalizeMatch({ matchId });
  };
  
  const handleCancelMatch = (matchId: string) => {
    cancelMatch({ matchId });
  };
  
  const handleViewDetails = (match: any) => {
    setSelectedMatch(match);
    setIsDetailsOpen(true);
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
                disabled={isFindingMatches || connectionError || isLoadingMatches}
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
          {/* Error States */}
          {connectionError ? (
            <ConnectionError 
              onRetry={handleRefresh} 
              isRetrying={isLoadingMatches} 
            />
          ) : matchesError ? (
            <ErrorMessage 
              message={matchesError.message} 
              onRetry={handleRefresh}
              isRetrying={isLoadingMatches}
            />
          ) : (
            /* Main Content */
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="active">Active Matches</TabsTrigger>
                <TabsTrigger value="past">Past Matches</TabsTrigger>
              </TabsList>
              
              {/* Active Matches Tab */}
              <TabsContent value="active">
                {isLoadingMatches ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : activeMatches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    You don't have any active matches. Check back later.
                  </p>
                ) : (
                  <Table>
                    <TableCaption>Your active leave swap matches</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>My Block</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Other Block</TableHead>
                        <TableHead>Other User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeMatches.map(match => (
                        <TableRow key={match.match_id}>
                          <TableCell className="font-medium">{match.my_block_number}</TableCell>
                          <TableCell>
                            {formatDate(match.my_start_date)} - {formatDate(match.my_end_date)}
                          </TableCell>
                          <TableCell>{match.other_block_number}</TableCell>
                          <TableCell>
                            {match.other_user_name} <span className="text-xs text-gray-500">({match.other_employee_id || 'N/A'})</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={match.match_status} />
                          </TableCell>
                          <TableCell>
                            <MatchActions 
                              match={match}
                              onViewDetails={() => handleViewDetails(match)}
                              onAccept={() => handleAcceptMatch(match.match_id)}
                              onFinalize={() => handleFinalizeMatch(match.match_id)}
                              onCancel={() => handleCancelMatch(match.match_id)}
                              isAccepting={isAcceptingMatch}
                              isFinalizing={isFinalizingMatch}
                              isCancelling={isCancellingMatch}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
              
              {/* Past Matches Tab */}
              <TabsContent value="past">
                {isLoadingMatches ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : pastMatches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    You don't have any past matches.
                  </p>
                ) : (
                  <Table>
                    <TableCaption>Your past leave swap matches</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>My Block</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Their Block</TableHead>
                        <TableHead>Other User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Completed On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastMatches.map(match => (
                        <TableRow key={match.match_id}>
                          <TableCell className="font-medium">{match.my_block_number}</TableCell>
                          <TableCell>
                            {formatDate(match.my_start_date)} - {formatDate(match.my_end_date)}
                          </TableCell>
                          <TableCell>{match.other_block_number}</TableCell>
                          <TableCell>
                            {match.other_user_name} <span className="text-xs text-gray-500">({match.other_employee_id || 'N/A'})</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={match.match_status} />
                          </TableCell>
                          <TableCell>{formatDate(match.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      
      {/* Match Details Dialog */}
      <MatchDetailsDialog 
        match={selectedMatch}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
};

export default MatchedLeaveSwaps;
