
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

// Schema for organization fields
export const organizationSchema = z.object({
  organization: z.string().min(1, 'Please select an organization'),
  organizationCode: z.string().min(1, 'Organization code is required'),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;

interface OrganizationVerifierProps {
  onVerified: (values: OrganizationFormValues) => void;
  isLoading: boolean;
  checkOrganizationCode: (code: string) => Promise<boolean>;
}

export function OrganizationVerifier({ 
  onVerified, 
  isLoading, 
  checkOrganizationCode 
}: OrganizationVerifierProps) {
  const [verifying, setVerifying] = useState(false);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organization: '',
      organizationCode: '',
    },
    mode: 'onChange',
  });

  const verifyOrganizationCode = async () => {
    const organizationCode = form.getValues('organizationCode');
    if (!organizationCode) {
      toast({
        title: "Code Required",
        description: "Please enter an organization code to verify.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    try {
      const isValid = await checkOrganizationCode(organizationCode);
      if (isValid) {
        const values = form.getValues();
        onVerified(values);
        toast({
          title: "Code Verified",
          description: "Your organization code has been verified.",
        });
      } else {
        toast({
          title: "Invalid Organization Code",
          description: "The organization code you entered is invalid. Please reach out to AV Shift Swap pages for the correct code.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: "There was a problem verifying your organization code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Organization Details</h3>
      
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an organization" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ambulance Victoria">Ambulance Victoria</SelectItem>
                    <SelectItem value="more to follow..." disabled>more to follow...</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex space-x-2">
            <div className="flex-1">
              <FormField
                control={form.control}
                name="organizationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your organization code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={verifyOrganizationCode}
                disabled={isLoading || verifying}
              >
                {verifying ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}
