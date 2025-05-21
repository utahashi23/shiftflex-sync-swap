
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ColleagueType {
  id: string;
  name: string;
  status: string;
}

export const SimpleColleagueTypeSettings = () => {
  const [colleagueTypes, setColleagueTypes] = useState<ColleagueType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTypeName, setNewTypeName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchColleagueTypes();
  }, []);

  const fetchColleagueTypes = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching colleague types...");
      const { data, error } = await supabase
        .from('colleague_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching colleague types:", error);
        throw error;
      }
      console.log("Colleague types fetched:", data);
      setColleagueTypes(data || []);
    } catch (error: any) {
      console.error("Error in fetchColleagueTypes:", error);
      toast({
        title: "Error",
        description: `Failed to load colleague types: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;

    try {
      const { error } = await supabase
        .from('colleague_types')
        .insert({ name: newTypeName.trim(), status: 'active' });

      if (error) throw error;

      toast({
        title: "Success",
        description: `New colleague type "${newTypeName}" added.`,
      });
      
      setNewTypeName('');
      fetchColleagueTypes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to add colleague type: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Colleague Types</CardTitle>
        <CardDescription>Manage the colleague type options available in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter new type name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddType} disabled={!newTypeName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2">Loading colleague types...</span>
            </div>
          ) : colleagueTypes.length === 0 ? (
            <div className="text-center py-8 border rounded-md bg-muted/50">
              <p className="text-muted-foreground">No colleague types configured yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colleagueTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        type.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {type.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
