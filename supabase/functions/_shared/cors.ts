
// Define CORS headers for all edge functions to use
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to validate the authorization header
export const getAuthToken = (req: Request): string | null => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('Missing Authorization header');
    return null;
  }
  
  // Extract token from "Bearer <token>"
  const match = authHeader.match(/^Bearer\s+(.*)$/i);
  if (!match) {
    console.error('Invalid Authorization header format, expected Bearer token');
    return null;
  }
  
  const token = match[1];
  return token || null;
}
