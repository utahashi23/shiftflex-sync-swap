
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface UserSkillset {
  id: string;
  user_id: string;
  skillset_id: string;
  skillset_name?: string;
  created_at: string;
}

export const useUserSkillsets = () => {
  const [userSkillsets, setUserSkillsets] = useState<UserSkillset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  const fetchUserSkillsets = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get user's skillsets with colleague type names
      const { data, error } = await supabase
        .from('user_skillsets')
        .select(`
          id, 
          user_id, 
          skillset_id, 
          created_at,
          colleague_types (name)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Transform data to include skillset_name
      const transformedData = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        skillset_id: item.skillset_id,
        skillset_name: item.colleague_types?.name,
        created_at: item.created_at
      })) || [];
      
      setUserSkillsets(transformedData);
    } catch (error: any) {
      console.error('Error fetching user skillsets:', error);
      toast({
        title: "Error fetching skillsets",
        description: error.message || "Could not load your skillsets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserSkillsets = async (skillsetIds: string[]) => {
    if (!user) return false;
    
    try {
      // First, delete all existing user skillsets
      const { error: deleteError } = await supabase
        .from('user_skillsets')
        .delete()
        .eq('user_id', user.id);
      
      if (deleteError) throw deleteError;
      
      // Then insert the new skillsets
      if (skillsetIds.length > 0) {
        const skillsetsToInsert = skillsetIds.map(skillsetId => ({
          user_id: user.id,
          skillset_id: skillsetId
        }));
        
        const { error: insertError } = await supabase
          .from('user_skillsets')
          .insert(skillsetsToInsert);
        
        if (insertError) throw insertError;
      }
      
      // Refresh the user skillsets
      await fetchUserSkillsets();
      
      return true;
    } catch (error: any) {
      console.error('Error updating user skillsets:', error);
      toast({
        title: "Error updating skillsets",
        description: error.message || "Could not update your skillsets",
        variant: "destructive",
      });
      return false;
    }
  };
  
  useEffect(() => {
    if (user) {
      fetchUserSkillsets();
    }
  }, [user]);
  
  return {
    userSkillsets,
    isLoading,
    fetchUserSkillsets,
    updateUserSkillsets
  };
};
