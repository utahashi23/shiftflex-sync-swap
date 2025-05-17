
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, RefreshCw, Search, Trash } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useImprovedSwapMatches } from '@/hooks/swap-matches/useImprovedSwapMatches';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImprovedSwapForm } from './swaps/ImprovedSwapForm';

const ImprovedShiftSwaps = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const {
    swaps,
    matches,
    isLoading,
    isProcessing,
    error,
    fetchUserSwaps,
    findMatches,
    createSwapRequest,
    acceptMatch,
    deleteSwapRequest
  } = useImprovedSwapMatches();

  const handleRefresh = () => {
    fetchUserSwaps();
    if (activeTab === 'matches') {
      findMatches();
    }
  };
  
  const handleFindMatches = () => {
    findMatches();
    setActiveTab('matches');
  };

  const handleCreateSwap = async (shiftId: string, wantedDates: string[], acceptedTypes: string[]) => {
    try {
      const success = await createSwapRequest(shiftId, wantedDates, acceptedTypes);
      if (success) {
        setIsFormOpen(false);
      }
      return success;
    } catch (error) {
      console.error("Error in handleCreateSwap:", error);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Improved Shift Swaps</h1>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={() => setIsFormOpen(true)}
          >
            <Calendar className="h-4 w-4" />
            New Swap Request
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {error.message || 'An unknown error occurred'}
          </AlertDescription>
        </Alert>
      )}

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="matches">Available Matches</TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-7 w-1/3 mb-4" />
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <Skeleton className="h-5 w-2/3 mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </Card>
              ))}
            </div>
          ) : swaps.length > 0 ? (
            <div className="space-y-4">
              {swaps.map((swap) => (
                <Card key={swap.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>Swap Request {swap.status !== 'pending' && `• ${swap.status}`}</CardTitle>
                        <CardDescription>
                          Created on {format(parseISO(swap.created_at), 'PPP')}
                        </CardDescription>
                      </div>
                      
                      {swap.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSwapRequest(swap.id)}
                          disabled={isProcessing}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">From Shift</p>
                          {swap.shiftDetails ? (
                            <>
                              <p className="text-lg">{format(parseISO(swap.shiftDetails.date), 'PPP')}</p>
                              <p className="text-sm text-gray-600">
                                {swap.shiftDetails.truck_name || 'Unknown location'}{' '}
                                ({swap.shiftDetails.start_time?.substring(0, 5)} - {swap.shiftDetails.end_time?.substring(0, 5)})
                              </p>
                            </>
                          ) : (
                            <p className="text-gray-500">Loading shift details...</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Desired Dates</p>
                          <div className="flex flex-col gap-1">
                            {swap.wantedDates && swap.wantedDates.length > 0 ? (
                              swap.wantedDates.map((date, index) => (
                                <p key={index} className="text-md">{format(parseISO(date), 'PPP')}</p>
                              ))
                            ) : (
                              <p className="text-lg">{format(parseISO(swap.wanted_date), 'PPP')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Acceptable Shift Types</p>
                        <div className="flex flex-wrap gap-2">
                          {swap.accepted_shift_types.map((type) => (
                            <span 
                              key={type} 
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                type === 'day' ? 'bg-yellow-100 text-yellow-800' :
                                type === 'afternoon' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>

                      {swap.regionPreferences && (
                        <div>
                          <p className="text-sm font-medium mb-2">Region/Area Preferences</p>
                          <div className="flex flex-wrap gap-2">
                            {swap.regionPreferences.map((pref, index) => (
                              <span 
                                key={index} 
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                {pref.region_name} {pref.area_name ? `- ${pref.area_name}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {swap.status === 'pending' && (
                        <Button
                          onClick={handleFindMatches}
                          disabled={isProcessing}
                          className="w-full"
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Find Matches
                        </Button>
                      )}
                      
                      {swap.status === 'matched' && (
                        <Button
                          onClick={() => acceptMatch(swap.id)}
                          disabled={isProcessing}
                          variant="default"
                          className="w-full"
                        >
                          Accept Match
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-secondary/20 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">No Swap Requests</h3>
              <p className="text-gray-600 mb-6">You haven't created any shift swap requests yet.</p>
              <Button onClick={() => setIsFormOpen(true)}>Create a Swap Request</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="matches">
          {swaps.length === 0 ? (
            <div className="text-center py-12 bg-secondary/20 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">No Requests to Match</h3>
              <p className="text-gray-600 mb-6">
                You need to create a swap request before you can find matches.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>Create a Swap Request</Button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Button
                  onClick={handleFindMatches}
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                >
                  <Search className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                  Find Potential Matches
                </Button>
              </div>

              {isLoading || isProcessing ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i} className="p-6">
                      <Skeleton className="h-7 w-1/3 mb-4" />
                      <Skeleton className="h-5 w-1/2 mb-2" />
                      <Skeleton className="h-5 w-2/3 mb-4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-4">
                  {matches.map((match) => (
                    <Card key={`${match.request1_id}-${match.request2_id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle>Potential Match</CardTitle>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {match.compatibility_score}% Compatible
                          </span>
                        </div>
                        <CardDescription>
                          {match.is_requester1 ? 'Your request' : 'Their request'} matches with 
                          {match.is_requester1 ? ' their' : ' your'} available shift
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 border rounded-md">
                              <p className="text-sm font-medium mb-1">Your Shift</p>
                              <p className="text-base">
                                {match.my_shift?.date ? format(parseISO(match.my_shift.date), 'PPP') : 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {match.my_shift?.truck_name || 'Unknown location'} 
                                {match.my_shift?.start_time && match.my_shift?.end_time && 
                                  ` (${match.my_shift.start_time.substring(0, 5)} - ${match.my_shift.end_time.substring(0, 5)})`
                                }
                              </p>
                            </div>
                            
                            <div className="p-3 border rounded-md">
                              <p className="text-sm font-medium mb-1">Their Shift</p>
                              <p className="text-base">
                                {match.other_shift?.date ? format(parseISO(match.other_shift.date), 'PPP') : 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {match.other_shift?.truck_name || 'Unknown location'}
                                {match.other_shift?.start_time && match.other_shift?.end_time && 
                                  ` (${match.other_shift.start_time.substring(0, 5)} - ${match.other_shift.end_time.substring(0, 5)})`
                                }
                              </p>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => acceptMatch(match.is_requester1 ? match.request1_id : match.request2_id)}
                            disabled={isProcessing}
                            className="w-full"
                          >
                            Accept This Match
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-secondary/20 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">No Matches Found</h3>
                  <p className="text-gray-600">
                    We couldn't find any matches for your swap requests at this time.
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {isFormOpen && (
        <ImprovedSwapForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateSwap}
        />
      )}
    </div>
  );
};

export default ImprovedShiftSwaps;
