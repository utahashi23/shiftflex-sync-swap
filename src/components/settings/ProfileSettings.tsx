
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ProfileSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [organization, setOrganization] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [regions, setRegions] = useState<{id: string, name: string}[]>([]);
  
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        setIsLoading(true);
        try {
          // Fetch profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setFirstName(data.first_name || '');
            setLastName(data.last_name || '');
            setEmployeeId(data.employee_id || '');
            setOrganization(data.organization || '');
          }
          
          // Fetch regions for organization dropdown
          const { data: regionsData, error: regionsError } = await supabase
            .from('regions')
            .select('id, name')
            .eq('status', 'active')
            .order('name');
            
          if (regionsError) throw regionsError;
          
          setRegions(regionsData || []);
        } catch (error) {
          console.error('Error loading profile:', error);
          toast({
            title: 'Error',
            description: 'Failed to load profile data',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadProfile();
  }, [user]);
  
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          employee_id: employeeId,
          organization: organization
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      
      // Invalidate queries that might depend on profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal profile details</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">Loading profile data...</div>
        ) : (
          <form 
            className="space-y-4" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveProfile();
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="Your first name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Your last name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input 
                id="employeeId" 
                value={employeeId} 
                onChange={(e) => setEmployeeId(e.target.value)} 
                placeholder="Your employee ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select value={organization} onValueChange={setOrganization}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region.id} value={region.name}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
