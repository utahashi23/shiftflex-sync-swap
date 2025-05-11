
import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar, RefreshCw, Check, X, Mail, Search } from 'lucide-react';
import { useLeaveSwapMatches } from '@/hooks/leave-blocks/useLeaveSwapMatches';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MatchedLeaveSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedLeaveSwaps = ({ setRefreshTrigger }: MatchedLeaveSwapsProps) => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  
  const {
    activeMatches,
    pastMatches,
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
  
  const handleAcceptMatch = (matchId: string) => {
    acceptMatch({ matchId });
    setSelectedMatchId(null);
  };
  
  const handleFinalizeMatch = (matchId: string) => {
    finalizeMatch({ matchId });
    setSelectedMatchId(null);
  };
  
  const handleCancelMatch = (matchId: string) => {
    cancelMatch({ matchId });
    setSelectedMatchId(null);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'accepted':
        return <Badge variant="secondary">Accepted</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getMatchedSwapDetails = (matchId: string) => {
    return [...activeMatches, ...pastMatches].find(match => match.match_id === matchId);
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
                disabled={isFindingMatches}
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
                        <TableHead>My Period</TableHead>
                        <TableHead>Their Block</TableHead>
                        <TableHead>Their Period</TableHead>
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
                            {formatDate(match.other_start_date)} - {formatDate(match.other_end_date)}
                          </TableCell>
                          <TableCell>{getStatusBadge(match.match_status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {match.match_status === 'pending' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedMatchId(match.match_id)}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Accept
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Accept Leave Swap</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to accept this leave swap match?
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <p><strong>Your block:</strong> {match.my_block_number} ({formatDate(match.my_start_date)} - {formatDate(match.my_end_date)})</p>
                                      <p><strong>Their block:</strong> {match.other_block_number} ({formatDate(match.other_start_date)} - {formatDate(match.other_end_date)})</p>
                                      <p><strong>Other user:</strong> {match.other_user_name}</p>
                                    </div>
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                      </DialogClose>
                                      <Button 
                                        onClick={() => handleAcceptMatch(match.match_id)}
                                        disabled={isAcceptingMatch}
                                      >
                                        Accept Swap
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}
                              
                              {match.match_status === 'accepted' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      onClick={() => setSelectedMatchId(match.match_id)}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Finalize
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Finalize Leave Swap</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to finalize this leave swap? This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <p><strong>Your block:</strong> {match.my_block_number} ({formatDate(match.my_start_date)} - {formatDate(match.my_end_date)})</p>
                                      <p><strong>Their block:</strong> {match.other_block_number} ({formatDate(match.other_start_date)} - {formatDate(match.other_end_date)})</p>
                                      <p><strong>Other user:</strong> {match.other_user_name}</p>
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        Make sure you have received management approval before finalizing this swap.
                                      </p>
                                    </div>
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                      </DialogClose>
                                      <Button 
                                        onClick={() => handleFinalizeMatch(match.match_id)}
                                        disabled={isFinalizingMatch}
                                      >
                                        Finalize Swap
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setSelectedMatchId(match.match_id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Cancel Leave Swap</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to cancel this leave swap match?
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <p><strong>Your block:</strong> {match.my_block_number} ({formatDate(match.my_start_date)} - {formatDate(match.my_end_date)})</p>
                                    <p><strong>Their block:</strong> {match.other_block_number} ({formatDate(match.other_start_date)} - {formatDate(match.other_end_date)})</p>
                                    <p><strong>Other user:</strong> {match.other_user_name}</p>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Keep Match</Button>
                                    </DialogClose>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => handleCancelMatch(match.match_id)}
                                      disabled={isCancellingMatch}
                                    >
                                      Cancel Match
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
              
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
                        <TableHead>My Period</TableHead>
                        <TableHead>Their Block</TableHead>
                        <TableHead>Their Period</TableHead>
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
                            {formatDate(match.other_start_date)} - {formatDate(match.other_end_date)}
                          </TableCell>
                          <TableCell>{getStatusBadge(match.match_status)}</TableCell>
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
    </div>
  );
};

export default MatchedLeaveSwaps;
