
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Utility function to manually trigger the hourly match notification check
 * This is useful for testing and debugging
 */
export const triggerHourlyMatchNotification = async (): Promise<boolean> => {
  try {
    console.log('Manually triggering hourly match notification check...');
    
    // Add timestamp and debug info to help track function execution
    const timestamp = new Date().toISOString();
    const debugInfo = {
      manual_trigger: true,
      timestamp: timestamp,
      client_info: navigator.userAgent,
      trigger_source: window.location.pathname
    };
    
    console.log('Debug info for trigger:', debugInfo);
    
    const { data, error } = await supabase.functions.invoke('hourly_match_notification', {
      body: debugInfo
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
    
    console.log('Hourly check triggered successfully with response:', data);
    toast({
      title: 'Success',
      description: 'Hourly match notification check triggered successfully. Check console for details.',
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

/**
 * Get the status of the hourly match notification function
 */
export const getHourlyMatchNotificationStatus = async (): Promise<any> => {
  try {
    console.log('Checking status of hourly match notification function...');
    
    const { data, error } = await supabase.functions.invoke('hourly_match_notification_status', {
      body: { check_status: true }
    });
    
    if (error) {
      console.error('Error checking function status:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Function status:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in getHourlyMatchNotificationStatus:', err);
    return { success: false, error: err.message };
  }
};

