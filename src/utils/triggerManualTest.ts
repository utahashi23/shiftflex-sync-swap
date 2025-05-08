
import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger a test run of the match notification system for a specific user
 */
export async function triggerMatchNotificationTest(userId: string): Promise<boolean> {
  try {
    console.log(`Running test match notification for user: ${userId}`);
    
    const { data, error } = await supabase.functions.invoke('check_matches_and_notify', {
      body: {
        triggered_at: new Date().toISOString(),
        test_user_id: userId
      }
    });
    
    if (error) {
      console.error('Error running match notification test:', error);
      return false;
    }
    
    console.log('Test result:', data);
    return true;
  } catch (e) {
    console.error('Error triggering test:', e);
    return false;
  }
}

// Run the test for the specified user
export async function runTestNow(): Promise<void> {
  const testUserId = '2e8fce25-0d63-4148-abd9-2653c31d9b0c'; // The specified test user ID
  console.log(`Running test for user ID: ${testUserId}`);
  
  const result = await triggerMatchNotificationTest(testUserId);
  
  if (result) {
    console.log('Test successfully triggered. Please check your email.');
  } else {
    console.error('Test failed to trigger.');
  }
}

// You can run this function from the browser console with:
// import { runTestNow } from '@/utils/triggerManualTest'; runTestNow();
