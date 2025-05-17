
// Follow CORS headers setup with improved error handling
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Helper to handle CORS preflight requests
export const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }
  return null;
};

// Helper to create a consistent error response with CORS headers
export const createErrorResponse = (message: string, status: number = 400) => {
  return new Response(
    JSON.stringify({
      error: message,
      success: false
    }),
    {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};

// Helper to create a consistent success response with CORS headers
export const createSuccessResponse = (data: any, status: number = 200) => {
  return new Response(
    JSON.stringify({
      data: data,
      success: true
    }),
    {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};
