
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
import { Calendar, RefreshCw, Check, X, Copy, FileText, Search } from 'lucide-react';
import { useLeaveSwapMatches } from '@/hooks/leave-blocks/useLeaveSwapMatches';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';

interface MatchedLeaveSwapsProps {
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
}

const MatchedLeaveSwaps = ({ setRefreshTrigger }: MatchedLeaveSwapsProps) => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const { toast } = useToast();
  
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
    console.log(`Handling acceptance for match: ${matchId}`);
    acceptMatch({ matchId });
  };
  
  const handleFinalizeMatch = (matchId: string) => {
    finalizeMatch({ matchId });
  };
  
  const handleCancelMatch = (matchId: string) => {
    cancelMatch({ matchId });
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
                              {/* Swap Details Button - Always shown */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedMatchId(match.match_id)}
                                    className="flex items-center gap-1"
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    Swap Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Leave Swap Details</DialogTitle>
                                    <DialogDescription>
                                      View the details of this leave swap match
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4 space-y-4">
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
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">Close</Button>
                                    </DialogClose>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              {/* Accept Button - Only shown for pending matches */}
                              {match.match_status === 'pending' && (
                                <Button 
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700" 
                                  onClick={() => handleAcceptMatch(match.match_id)}
                                  disabled={isAcceptingMatch}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                              )}
                              
                              {/* Finalize Button - Only shown for accepted matches */}
                              {match.match_status === 'accepted' && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleFinalizeMatch(match.match_id)}
                                  disabled={isFinalizingMatch}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Finalize
                                </Button>
                              )}
                              
                              {/* Cancel Button - Shown for all active matches */}
                              {match.match_status !== 'completed' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleCancelMatch(match.match_id)}
                                  disabled={isCancellingMatch}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
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
