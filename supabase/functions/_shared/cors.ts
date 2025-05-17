
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Helper function to handle CORS preflight requests
export function handleCors(req: Request) {
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
