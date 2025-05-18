
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImprovedSwapForm } from "./swaps/ImprovedSwapForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RegionPreferencesButton } from "./swaps/RegionPreferencesButton";
import SwapRequestCard from "./swaps/SwapRequestCard";
import { useEffect } from "react";
import { useSwapRequests } from "@/hooks/swap-requests";
import { MatchedSwapsTabs } from "./matched-swaps/MatchedSwapsTabs";
import { SwapMatch as ComponentSwapMatch } from "./matched-swaps/types";
import { SwapMatch as HookSwapMatch } from "@/hooks/swap-matches/types";

// Adapter function to convert between swap match types
function adaptSwapMatches(matches: HookSwapMatch[]): ComponentSwapMatch[] {
  return matches.map(match => ({
    ...match,
    myShift: {
      ...match.myShift,
      truckName: match.myShift.truckName || null, // Ensure truckName is not undefined
      // Ensure type is one of the allowed types
      type: (match.myShift.type === 'day' || match.myShift.type === 'afternoon' || 
             match.myShift.type === 'night') ? match.myShift.type : 'unknown'
    },
    otherShift: {
      ...match.otherShift,
      truckName: match.otherShift.truckName || null, // Ensure truckName is not undefined
      // Ensure type is one of the allowed types
      type: (match.otherShift.type === 'day' || match.otherShift.type === 'afternoon' || 
             match.otherShift.type === 'night') ? match.otherShift.type : 'unknown'
    }
  }));
}

const ImprovedShiftSwaps = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    matches: hookMatches, 
    pastMatches: hookPastMatches, 
    isLoading: isMatchesLoading, 
    refreshMatches,
    createSwapRequest 
  } = useSwapRequests();

  // Convert hook match types to component match types
  const matches = adaptSwapMatches(hookMatches || []);
  const pastMatches = adaptSwapMatches(hookPastMatches || []);

  // Fetch user's swap requests
  useEffect(() => {
    const fetchUserRequests = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("improved_shift_swaps")
          .select("*, shifts(*)")
          .eq("requester_id", user.id);
          
        if (error) throw error;
        
        setUserRequests(data || []);
      } catch (err: any) {
        console.error("Error fetching swap requests:", err);
        toast({
          title: "Error",
          description: "Failed to load your swap requests",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserRequests();
  }, [user]);

  // Handle creating a swap request
  const handleCreateSwap = async (shiftIds: string[], wantedDates: string[], acceptedTypes: string[]) => {
    setIsSubmitting(true);
    try {
      const success = await createSwapRequest(shiftIds, wantedDates, acceptedTypes);
      
      if (success) {
        toast({
          title: "Success",
          description: "Swap request created successfully",
        });
        
        // Reload the user's swap requests
        const { data, error } = await supabase
          .from("improved_shift_swaps")
          .select("*, shifts(*)")
          .eq("requester_id", user?.id);
          
        if (error) throw error;
        
        setUserRequests(data || []);
        
        // Switch to the "My Swaps" tab after creating a swap
        setActiveTab("mySwaps");
      } else {
        throw new Error("Failed to create swap request");
      }
      
      return success;
    } catch (err: any) {
      console.error("Error creating swap request:", err);
      toast({
        title: "Error",
        description: "Failed to create swap request",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete request
  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("improved_shift_swaps")
        .delete()
        .eq("id", requestId);
        
      if (error) throw error;
      
      setUserRequests(userRequests.filter(request => request.id !== requestId));
      
      toast({
        title: "Success",
        description: "Swap request deleted successfully",
      });
    } catch (err: any) {
      console.error("Error deleting swap request:", err);
      toast({
        title: "Error",
        description: "Failed to delete swap request",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <RegionPreferencesButton />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Swap</TabsTrigger>
          <TabsTrigger value="mySwaps">My Swaps</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="mt-6 space-y-4">
          <ImprovedSwapForm
            isOpen={true}
            onClose={() => {}}
            onSubmit={handleCreateSwap}
            isDialog={false}
          />
        </TabsContent>
        
        <TabsContent value="mySwaps" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {userRequests.map((request) => (
              <SwapRequestCard
                key={request.id}
                request={request}
                onDelete={() => handleDeleteRequest(request.id)}
              />
            ))}
            
            {userRequests.length === 0 && !isLoading && (
              <div className="col-span-2 bg-muted/30 p-6 rounded-lg text-center">
                <h3 className="font-medium mb-2">No Swap Requests</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't created any swap requests yet. Go to the "Create Swap Request" tab to get started.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="matches" className="mt-6">
          <MatchedSwapsTabs
            activeTab="active"
            setActiveTab={() => {}}
            matches={matches}
            pastMatches={pastMatches}
            onAcceptSwap={(matchId) => console.log("Accept swap:", matchId)}
            onFinalizeSwap={(matchId) => console.log("Finalize swap:", matchId)}
            onCancelSwap={(matchId) => console.log("Cancel swap:", matchId)}
            onResendEmail={(matchId) => console.log("Resend email for swap:", matchId)}
            onRefresh={refreshMatches}
            isLoading={isMatchesLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedShiftSwaps;
