
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, RefreshCw, Search, Trash, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useImprovedSwapMatches } from '@/hooks/swap-matches/useImprovedSwapMatches';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm, Controller } from 'react-hook-form';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sunrise, 
  Sun, 
  Moon,
  Loader2
} from "lucide-react";
import { isValid } from "date-fns";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShiftDateField } from '@/components/shift-form/ShiftDateField';
import { toast } from '@/hooks/use-toast';

type FormValues = {
  shiftId: string;
  wantedDates: Date[];
  acceptedTypes: {
    day: boolean;
    afternoon: boolean;
    night: boolean;
  };
  regionPreferences: {
    regionId: string;
    areaId?: string;
  }[];
};

const ImprovedShiftSwaps = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [shifts, setShifts] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const { user } = useAuth();
  
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

  const { control, register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      shiftId: '',
      wantedDates: [],
      acceptedTypes: {
        day: true,
        afternoon: true,
        night: true
      },
      regionPreferences: []
    }
  });

  const selectedShiftId = watch('shiftId');
  const wantedDates = watch('wantedDates');
  const acceptedTypes = watch('acceptedTypes');
  const regionPreferences = watch('regionPreferences');

  // Fetch user's shifts when component mounts or tab changes to create
  useEffect(() => {
    if (activeTab === 'create') {
      fetchShifts();
      fetchRegionsAndAreas();
    } else if (activeTab === 'requests') {
      fetchUserSwaps();
    } else if (activeTab === 'matches') {
      findMatches();
    }
  }, [activeTab, user]);

  // Fetch user's shifts
  const fetchShifts = async () => {
    if (!user) return;
    
    setIsLoadingShifts(true);
    try {
      // Call the RPC function to get shifts instead of directly querying the table
      const { data, error } = await supabase
        .rpc('get_all_shifts')
        .eq('status', 'scheduled');
        
      if (error) throw error;
      
      console.log(`Fetched ${data?.length || 0} shifts for user`);
      setShifts(data || []);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      toast({
        title: "Failed to load shifts",
        description: "Could not load your shifts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingShifts(false);
    }
  };
  
  // Fetch regions and areas
  const fetchRegionsAndAreas = async () => {
    try {
      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .eq('status', 'active');
        
      if (regionsError) throw regionsError;
      
      setRegions(regionsData || []);
      
      // Fetch areas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .eq('status', 'active');
        
      if (areasError) throw areasError;
      
      setAreas(areasData || []);
    } catch (err) {
      console.error('Error fetching regions/areas:', err);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'create') {
      fetchShifts();
      fetchRegionsAndAreas();
    } else if (activeTab === 'requests') {
      fetchUserSwaps();
    } else if (activeTab === 'matches') {
      findMatches();
    }
  };
  
  const handleFindMatches = () => {
    findMatches();
    setActiveTab('matches');
  };

  // Load data when needed
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
  };

  const onFormSubmit = async (data: FormValues) => {
    if (!data.shiftId || data.wantedDates.length === 0) {
      toast({
        title: "Incomplete form",
        description: "Please select a shift and at least one date",
        variant: "destructive"
      });
      return;
    }
    
    const acceptedTypesArray: string[] = [];
    if (data.acceptedTypes.day) acceptedTypesArray.push('day');
    if (data.acceptedTypes.afternoon) acceptedTypesArray.push('afternoon');
    if (data.acceptedTypes.night) acceptedTypesArray.push('night');
    
    if (acceptedTypesArray.length === 0) {
      toast({
        title: "Selection required",
        description: "Please select at least one shift type",
        variant: "destructive"
      });
      return;
    }
    
    // Format dates to ISO strings (YYYY-MM-DD)
    const formattedDates = data.wantedDates
      .filter(date => date && isValid(date))
      .map(date => format(date, 'yyyy-MM-dd'));
      
    try {
      const success = await createSwapRequest(data.shiftId, formattedDates, acceptedTypesArray);
      
      if (success) {
        reset();
        // Switch to My Requests tab after successful creation
        setActiveTab('requests');
      }
    } catch (error) {
      console.error("Error in creating swap request:", error);
      toast({
        title: "Failed to create request",
        description: "Could not create swap request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddRegionPreference = (regionId: string, areaId?: string) => {
    const currentPreferences = [...(regionPreferences || [])];
    
    // Check if this preference already exists
    const alreadyExists = currentPreferences.some(
      pref => pref.regionId === regionId && pref.areaId === areaId
    );
    
    if (!alreadyExists) {
      currentPreferences.push({ regionId, areaId });
      setValue('regionPreferences', currentPreferences);
    }
  };

  const handleRemoveRegionPreference = (index: number) => {
    const currentPreferences = [...(regionPreferences || [])];
    currentPreferences.splice(index, 1);
    setValue('regionPreferences', currentPreferences);
  };

  const selectedShift = shifts.find(shift => shift.id === selectedShiftId);

  // Helper function to format a date safely
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Unknown date';
    try {
      return format(parseISO(dateStr), 'PPP');
    } catch (e) {
      console.error(`Error formatting date: ${dateStr}`, e);
      return 'Invalid date';
    }
  };

  // Helper function to format a time safely
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '';
    if (timeStr.length >= 5) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Improved Shift Swaps</h1>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || isProcessing || isLoadingShifts}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isProcessing || isLoadingShifts ? 'animate-spin' : ''}`} />
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
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="create">Create a Swap</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="matches">Available Matches</TabsTrigger>
        </TabsList>
        
        {/* Create a Swap Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Shift Swap Request</CardTitle>
              <CardDescription>
                Select the shift you want to swap and specify your preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 py-2" onSubmit={handleSubmit(onFormSubmit)}>
                {/* Shift Selection */}
                <div className="space-y-2">
                  <Label htmlFor="shiftId">Select Your Shift</Label>
                  <Controller
                    name="shiftId"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingShifts}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingShifts ? "Loading shifts..." : "Select a shift to swap"} />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingShifts ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : shifts.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No shifts available</div>
                          ) : (
                            shifts.map(shift => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {format(new Date(shift.date), 'MMM d, yyyy')} - {shift.truck_name || 'Unknown location'}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                
                {/* Selected Shift Details */}
                {selectedShift && (
                  <div className="p-3 border rounded-md bg-secondary/20">
                    <p className="text-sm font-medium">Selected Shift</p>
                    <p className="text-base">{format(new Date(selectedShift.date), 'PPPP')}</p>
                    <p className="text-sm">
                      {selectedShift.start_time.substring(0, 5)} - {selectedShift.end_time.substring(0, 5)}
                    </p>
                    <p className="text-sm text-gray-500">{selectedShift.truck_name}</p>
                  </div>
                )}
                
                {/* Multiple Wanted Dates with calendar */}
                <div className="space-y-2">
                  <Label>Select Preferred Dates</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select the dates you would prefer to work instead.
                  </p>
                  <Controller
                    name="wantedDates"
                    control={control}
                    render={({ field }) => (
                      <ShiftDateField
                        value=""
                        onChange={() => {}}
                        multiSelect={true}
                        selectedDates={field.value}
                        onMultiDateChange={(dates) => field.onChange(dates)}
                      />
                    )}
                  />
                  
                  {/* Warning if no dates selected */}
                  {(!wantedDates || wantedDates.length === 0) && (
                    <p className="text-sm text-yellow-600">
                      Please select at least one preferred date
                    </p>
                  )}
                </div>
                
                {/* Accepted Shift Types */}
                <div className="space-y-2">
                  <Label>Acceptable Shift Types</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select what types of shifts you're willing to accept on your wanted dates.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="day-shift"
                        checked={acceptedTypes.day}
                        onCheckedChange={(checked) => {
                          setValue('acceptedTypes.day', checked === true);
                        }}
                      />
                      <Label htmlFor="day-shift" className="flex items-center">
                        <div className="bg-yellow-100 text-yellow-800 p-1 rounded-md mr-2">
                          <Sunrise className="h-4 w-4" />
                        </div>
                        <span>Day Shift</span>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="afternoon-shift"
                        checked={acceptedTypes.afternoon}
                        onCheckedChange={(checked) => {
                          setValue('acceptedTypes.afternoon', checked === true);
                        }}
                      />
                      <Label htmlFor="afternoon-shift" className="flex items-center">
                        <div className="bg-orange-100 text-orange-800 p-1 rounded-md mr-2">
                          <Sun className="h-4 w-4" />
                        </div>
                        <span>Afternoon Shift</span>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="night-shift"
                        checked={acceptedTypes.night}
                        onCheckedChange={(checked) => {
                          setValue('acceptedTypes.night', checked === true);
                        }}
                      />
                      <Label htmlFor="night-shift" className="flex items-center">
                        <div className="bg-blue-100 text-blue-800 p-1 rounded-md mr-2">
                          <Moon className="h-4 w-4" />
                        </div>
                        <span>Night Shift</span>
                      </Label>
                    </div>
                  </div>
                </div>
                
                {/* Region/Area Preferences */}
                <div className="space-y-2">
                  <Label>Region/Area Preferences</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select regions or specific areas you prefer for your swap.
                  </p>
                  
                  {/* Region selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select 
                      onValueChange={(value) => handleAddRegionPreference(value)}
                      disabled={regions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map(region => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      onValueChange={(value) => {
                        const [regionId, areaId] = value.split('|');
                        handleAddRegionPreference(regionId, areaId);
                      }}
                      disabled={areas.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an area" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map(region => (
                          <SelectItem key={`region-group-${region.id}`} value={region.id} disabled>
                            {region.name}
                          </SelectItem>
                        ))}
                        {areas.map(area => (
                          <SelectItem 
                            key={area.id} 
                            value={`${area.region_id}|${area.id}`}
                            className="pl-6"
                          >
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Display selected preferences */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(regionPreferences || []).map((pref, index) => {
                      const region = regions.find(r => r.id === pref.regionId);
                      const area = pref.areaId ? areas.find(a => a.id === pref.areaId) : null;
                      
                      return (
                        <Badge 
                          key={index}
                          variant="outline"
                          className="flex items-center gap-1 px-3 py-1"
                        >
                          {region?.name || 'Unknown'} {area && `- ${area.name}`}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveRegionPreference(index)}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                
                <Button 
                  type="submit"
                  disabled={!selectedShiftId || wantedDates.length === 0 || isProcessing}
                  className="mt-4"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Swap Request"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* My Requests Tab */}
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
                          Created on {formatDate(swap.created_at)}
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
                              <p className="text-lg">{formatDate(swap.shiftDetails.date)}</p>
                              <p className="text-sm text-gray-600">
                                {swap.shiftDetails.truck_name || 'Unknown location'}{' '}
                                ({formatTime(swap.shiftDetails.start_time)} - {formatTime(swap.shiftDetails.end_time)})
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
                                <p key={index} className="text-md">{formatDate(date)}</p>
                              ))
                            ) : (
                              <p className="text-lg">{formatDate(swap.wanted_date)}</p>
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

                      {swap.regionPreferences && swap.regionPreferences.length > 0 && (
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
              <Button onClick={() => setActiveTab('create')}>Create a Swap Request</Button>
            </div>
          )}
        </TabsContent>
        
        {/* Available Matches Tab */}
        <TabsContent value="matches">
          {swaps.length === 0 ? (
            <div className="text-center py-12 bg-secondary/20 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">No Requests to Match</h3>
              <p className="text-gray-600 mb-6">
                You need to create a swap request before you can find matches.
              </p>
              <Button onClick={() => setActiveTab('create')}>Create a Swap Request</Button>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  Click to search for matches with your current swap requests
                </p>
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
                                {match.my_shift?.date ? formatDate(match.my_shift.date) : 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {match.my_shift?.truck_name || 'Unknown location'} 
                                {match.my_shift?.start_time && match.my_shift?.end_time && 
                                  ` (${formatTime(match.my_shift.start_time)} - ${formatTime(match.my_shift.end_time)})`
                                }
                              </p>
                            </div>
                            
                            <div className="p-3 border rounded-md">
                              <p className="text-sm font-medium mb-1">Their Shift</p>
                              <p className="text-base">
                                {match.other_shift?.date ? formatDate(match.other_shift.date) : 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {match.other_shift?.truck_name || 'Unknown location'}
                                {match.other_shift?.start_time && match.other_shift?.end_time && 
                                  ` (${formatTime(match.other_shift.start_time)} - ${formatTime(match.other_shift.end_time)})`
                                }
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {match.other_shift?.userName || 'Unknown User'}
                                {match.other_shift?.employee_id && ` (ID: ${match.other_shift.employee_id})`}
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
                  <p className="text-gray-600 mb-6">
                    We couldn't find any potential matches for your swap requests.
                  </p>
                  <Button onClick={handleFindMatches}>Try Again</Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedShiftSwaps;
