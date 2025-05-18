
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImprovedSwapForm } from "./swaps/ImprovedSwapForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { SwapRequestCard } from "./swaps/SwapRequestCard";
import { useEffect } from "react";
import { RegionPreferencesButton } from "./swaps/RegionPreferencesButton";

const ImprovedShiftSwaps = () => {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

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
  const handleCreateSwap = async (shiftId: string, wantedDates: string[], acceptedTypes: string[]) => {
    setIsSubmitting(true);
    try {
      // For now, we'll just create one swap request per wanted date
      for (const date of wantedDates) {
        const { error } = await supabase.from("improved_shift_swaps").insert({
          requester_id: user?.id,
          requester_shift_id: shiftId,
          wanted_date: date,
          accepted_shift_types: acceptedTypes,
        });
        
        if (error) throw error;
      }
      
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
      return true;
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
      <div className="flex flex-col md:flex-row justify-between items-start gap-3">
        <Button 
          onClick={() => setShowForm(true)} 
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Create Swap Request
        </Button>
        
        <RegionPreferencesButton />
      </div>

      <ImprovedSwapForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateSwap}
      />

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
              You haven't created any swap requests yet. Click "Create Swap Request" to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImprovedShiftSwaps;
