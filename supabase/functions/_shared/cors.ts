
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  
  // Extract the token part (remove "Bearer " if present)
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  
  return authHeader;  // Return as-is if no "Bearer " prefix
}

export function createUnauthorizedResponse(message: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
  );
}
