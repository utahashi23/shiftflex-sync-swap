
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Utility for testing admin data access
 * This helps diagnose permission issues across different tables
 */

// Test admin access to swap requests
export const testAdminSwapRequestAccess = async () => {
  try {
    console.log('Testing admin access to swap requests...');
    
    // First check admin status
    const { data: adminStatus } = await supabase.rpc('test_admin_access');
    console.log('Admin status check:', adminStatus);
    
    // Try RPC function (most reliable for admin data)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_swap_requests');
    
    if (rpcError) {
      console.error('Error using RPC for swap requests:', rpcError);
      return {
        success: false,
        method: 'rpc',
        error: rpcError.message,
        data: null
      };
    }
    
    if (rpcData && rpcData.length > 0) {
      console.log(`Successfully retrieved ${rpcData.length} swap requests via RPC`);
      return {
        success: true,
        method: 'rpc',
        count: rpcData.length,
        data: rpcData
      };
    }
    
    // Fall back to direct query
    console.log('RPC returned no data, trying direct query...');
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_requests')
      .select('*')
      .limit(50);
    
    if (directError) {
      console.error('Error using direct query for swap requests:', directError);
      return {
        success: false,
        method: 'direct',
        error: directError.message,
        data: null
      };
    }
    
    console.log(`Successfully retrieved ${directData?.length || 0} swap requests via direct query`);
    return {
      success: true,
      method: 'direct',
      count: directData?.length || 0,
      data: directData
    };
  } catch (err: any) {
    console.error('Exception testing admin swap request access:', err);
    return {
      success: false,
      method: 'exception',
      error: err.message,
      data: null
    };
  }
};

// Test admin access to shifts
export const testAdminShiftsAccess = async () => {
  try {
    console.log('Testing admin access to shifts...');
    
    // Try RPC function first (more reliable)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_shifts');
    
    if (rpcError) {
      console.error('Error using RPC for shifts:', rpcError);
      return {
        success: false,
        method: 'rpc',
        error: rpcError.message,
        data: null
      };
    }
    
    if (rpcData && rpcData.length > 0) {
      console.log(`Successfully retrieved ${rpcData.length} shifts via RPC`);
      return {
        success: true,
        method: 'rpc',
        count: rpcData.length,
        data: rpcData
      };
    }
    
    // Fall back to direct query
    console.log('RPC returned no data, trying direct query...');
    const { data: directData, error: directError } = await supabase
      .from('shifts')
      .select('*')
      .limit(50);
    
    if (directError) {
      console.error('Error using direct query for shifts:', directError);
      return {
        success: false,
        method: 'direct',
        error: directError.message,
        data: null
      };
    }
    
    console.log(`Successfully retrieved ${directData?.length || 0} shifts via direct query`);
    return {
      success: true,
      method: 'direct',
      count: directData?.length || 0,
      data: directData
    };
  } catch (err: any) {
    console.error('Exception testing admin shifts access:', err);
    return {
      success: false,
      method: 'exception',
      error: err.message,
      data: null
    };
  }
};

// Test admin access to preferred dates
export const testAdminPreferredDatesAccess = async () => {
  try {
    console.log('Testing admin access to preferred dates...');
    
    // Try RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_preferred_dates');
    
    if (rpcError) {
      console.error('Error using RPC for preferred dates:', rpcError);
      return {
        success: false,
        method: 'rpc',
        error: rpcError.message,
        data: null
      };
    }
    
    if (rpcData && rpcData.length > 0) {
      console.log(`Successfully retrieved ${rpcData.length} preferred dates via RPC`);
      return {
        success: true,
        method: 'rpc',
        count: rpcData.length,
        data: rpcData
      };
    }
    
    // Fall back to direct query
    console.log('RPC returned no data, trying direct query...');
    const { data: directData, error: directError } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .limit(50);
    
    if (directError) {
      console.error('Error using direct query for preferred dates:', directError);
      return {
        success: false,
        method: 'direct',
        error: directError.message,
        data: null
      };
    }
    
    console.log(`Successfully retrieved ${directData?.length || 0} preferred dates via direct query`);
    return {
      success: true,
      method: 'direct',
      count: directData?.length || 0,
      data: directData
    };
  } catch (err: any) {
    console.error('Exception testing admin preferred dates access:', err);
    return {
      success: false,
      method: 'exception',
      error: err.message,
      data: null
    };
  }
};

// Test edge function access
export const testEdgeFunctionAccess = async () => {
  try {
    console.log('Testing edge function access for swap requests...');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        error: 'No active session found',
        data: null
      };
    }
    
    const userId = session.user.id;
    const authToken = session.access_token;
    
    // Use the edge function to get swap requests
    const response = await supabase.functions.invoke('get_swap_requests', {
      body: { 
        user_id: userId,
        status: 'pending',
        auth_token: authToken
      }
    });
    
    if (response.error) {
      console.error('Edge function error:', response.error);
      return {
        success: false,
        error: response.error.message || 'Edge function call failed',
        data: null
      };
    }
    
    console.log(`Successfully retrieved data from edge function`);
    return {
      success: true,
      count: Array.isArray(response.data) ? response.data.length : 0,
      data: response.data
    };
  } catch (err: any) {
    console.error('Exception testing edge function access:', err);
    return {
      success: false,
      error: err.message,
      data: null
    };
  }
};

// Test admin role verification
export const testAdminRoleVerification = async () => {
  try {
    console.log('Testing admin role verification...');
    
    const { data, error } = await supabase.rpc('test_admin_access');
    
    if (error) {
      console.error('Error checking admin status:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
    
    return {
      success: true,
      isAdmin: data?.is_admin === true,
      data: data
    };
  } catch (err: any) {
    console.error('Exception testing admin role:', err);
    return {
      success: false,
      error: err.message,
      data: null
    };
  }
};
