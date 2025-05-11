
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
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar, RefreshCw, Check, X, Copy, Search, FileText } from 'lucide-react';
import { useLeaveSwapMatches } from '@/hooks/leave-blocks/useLeaveSwapMatches';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { LeaveSwapMatch } from '@/types/leave-blocks';
import { useAuth } from '@/hooks/useAuth';

interface MatchedLeaveSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedLeaveSwaps = ({ setRefreshTrigger }: MatchedLeaveSwapsProps) => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [viewDetailsMatchId, setViewDetailsMatchId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const {
    leaveSwapMatches,
    activeMatches: rawActiveMatches,
    pastMatches: rawPastMatches,
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

  // Filter matches where the current user is the requester
  const filterUserMatches = (matches: LeaveSwapMatch[]): LeaveSwapMatch[] => {
    // If we don't have a logged in user, return all matches
    if (!user) return matches;
    
    // Filter to just show matches where the current user is the requester
    // Using the correct property from LeaveSwapMatch type
    return matches.filter(match => match.requester_id === user.id);
  };
  
  // Apply user filtering first, then deduplicate
  const activeMatches = filterUserMatches(rawActiveMatches);
  const pastMatches = filterUserMatches(rawPastMatches);
  
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
  
  const copyToClipboard = (match) => {
    // Create a comprehensive formatted text with all swap details
    const swapDetails = `
LEAVE BLOCK SWAP DETAILS

MY DETAILS
Name: ${match.my_user_name}
Service Number: ${match.my_employee_id || 'N/A'}
Leave Block: ${match.my_block_number} (${formatDate(match.my_start_date)} - ${formatDate(match.my_end_date)})

OTHER USER DETAILS
Name: ${match.other_user_name}
Service Number: ${match.other_employee_id || 'N/A'}
Leave Block: ${match.other_block_number} (${formatDate(match.other_start_date)} - ${formatDate(match.other_end_date)})

Status: ${match.match_status.toUpperCase()}
`;

    navigator.clipboard.writeText(swapDetails).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "All leave swap details have been copied to your clipboard.",
      });
    }).catch(err => {
      console.error('Could not copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy text to clipboard.",
        variant: "destructive",
      });
    });
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
                          <TableCell>{getStatusBadge(match.match_status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {/* Swap Details Button */}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setViewDetailsMatchId(match.match_id)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Swap Details
                              </Button>
                              
                              {match.match_status === 'pending' && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleAcceptMatch(match.match_id)}
                                  disabled={isAcceptingMatch}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                              )}
                              
                              {match.match_status === 'accepted' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleCancelMatch(match.match_id)}
                                    disabled={isCancellingMatch}
                                    className="text-red-600 hover:bg-red-50 border-red-200"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                  
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => handleFinalizeMatch(match.match_id)}
                                    disabled={isFinalizingMatch}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Finalize
                                  </Button>
                                </>
                              )}
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
                        <TableHead>Period</TableHead>
                        <TableHead>Their Block</TableHead>
                        <TableHead>Other User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Completed On</TableHead>
                        <TableHead>Actions</TableHead>
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
                          <TableCell>{getStatusBadge(match.match_status)}</TableCell>
                          <TableCell>{formatDate(match.created_at)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setViewDetailsMatchId(match.match_id)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </TableCell>
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
      
      {/* Swap Details Dialog */}
      <Dialog
        open={viewDetailsMatchId !== null}
        onOpenChange={(open) => {
          if (!open) setViewDetailsMatchId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Swap Details</DialogTitle>
            <DialogDescription>
              Review the details of this leave block swap
            </DialogDescription>
          </DialogHeader>
          
          {viewDetailsMatchId && (
            <div className="py-4 space-y-4">
              {(() => {
                const match = getMatchedSwapDetails(viewDetailsMatchId);
                if (!match) return <p>Loading details...</p>;
                
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Status</h3>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        match.match_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        match.match_status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        match.match_status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {match.match_status.charAt(0).toUpperCase() + match.match_status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 border-b pb-2">
                      <h3 className="text-sm font-semibold">Your Details</h3>
                      <p><strong>Name:</strong> {match.my_user_name} <span className="text-xs text-gray-500">({match.my_employee_id || 'N/A'})</span></p>
                      <p><strong>Block:</strong> {match.my_block_number} ({formatDate(match.my_start_date)} - {formatDate(match.my_end_date)})</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold">Other User Details</h3>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => copyToClipboard(match)}
                        >
                          <Copy className="h-4 w-4" />
                          Copy All Details
                        </Button>
                      </div>
                      <p><strong>Name:</strong> {match.other_user_name} <span className="text-xs text-gray-500">({match.other_employee_id || 'N/A'})</span></p>
                      <p><strong>Block:</strong> {match.other_block_number} ({formatDate(match.other_start_date)} - {formatDate(match.other_end_date)})</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchedLeaveSwaps;
