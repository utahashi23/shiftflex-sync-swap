
// CORS headers for all responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Helper function to extract auth token
export const getAuthToken = (req: Request): string | null => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  
  // Extract the token part (remove "Bearer " if present)
  return authHeader.split(' ')[1] || authHeader;
};

// Helper function to create unauthorized response
export const createUnauthorizedResponse = (message: string = 'Unauthorized') => {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
};
