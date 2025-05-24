
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  
  // Extract token from "Bearer <token>" format
  const matches = authHeader.match(/^Bearer\s+(.+)$/);
  return matches ? matches[1] : null;
}

export function createUnauthorizedResponse(message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 401 
    }
  );
}
