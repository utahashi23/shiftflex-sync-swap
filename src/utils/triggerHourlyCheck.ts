
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Utility function to manually trigger the hourly match notification check
 * This is useful for testing and debugging
 */
export const triggerHourlyMatchNotification = async (): Promise<boolean> => {
  try {
    console.log('Manually triggering hourly match notification check...');
    
    const { data, error } = await supabase.functions.invoke('hourly_match_notification', {
      body: { 
        manual_trigger: true,
        timestamp: new Date().toISOString()
      }
    });
    
    if (error) {
      console.error('Error triggering hourly check:', error);
      toast({
        title: 'Error',
        description: `Failed to trigger hourly check: ${error.message}`,
        variant: 'destructive'
      });
      return false;
    }
    
    console.log('Hourly check triggered successfully:', data);
    toast({
      title: 'Success',
      description: 'Hourly match notification check triggered successfully',
      variant: 'default'
    });
    
    return true;
  } catch (err: any) {
    console.error('Error in triggerHourlyMatchNotification:', err);
    toast({
      title: 'Error',
      description: `Unexpected error: ${err.message}`,
      variant: 'destructive'
    });
    return false;
  }
};
