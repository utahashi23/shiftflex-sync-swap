
// CORS headers for edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Helper to extract authorization token from request
export function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Helper to create unauthorized response
export function createUnauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({
      error: message
    }),
    {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
