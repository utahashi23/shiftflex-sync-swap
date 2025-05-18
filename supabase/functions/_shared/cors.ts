
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'content-length, content-range'
};

// Helper function to handle CORS preflight requests
export function handleCors(req: Request) {
  console.log('Handling CORS for request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  return null;
}

// Helper function for error responses
export function createErrorResponse(message: string, status: number = 400) {
  console.log(`Creating error response: ${message} (${status})`);
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

// Helper function for success responses
export function createSuccessResponse(data: any) {
  return new Response(
    JSON.stringify({
      success: true,
      data: data
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

// Debug helper to log request details
export function logRequestDetails(req: Request) {
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', [...req.headers.entries()]);
}
