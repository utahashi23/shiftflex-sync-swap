
// Check Mailgun environment configuration
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Checking Mailgun environment configuration...")
    
    // Get API key and domain from environment variables
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');
    
    // Validate domain format
    const domainFormatValid = MAILGUN_DOMAIN && 
                              MAILGUN_DOMAIN.includes('.') && 
                              !MAILGUN_DOMAIN.startsWith('c1') &&
                              MAILGUN_DOMAIN.length < 100;
    
    // Validate API key format (should start with "key-")
    const apiKeyFormatValid = MAILGUN_API_KEY && 
                              MAILGUN_API_KEY.startsWith('key-') && 
                              MAILGUN_API_KEY.length > 10;
    
    // Check for specific domain format issues
    let domainIssues = null;
    if (MAILGUN_DOMAIN) {
      if (MAILGUN_DOMAIN.startsWith('c1') || MAILGUN_DOMAIN.startsWith('key-')) {
        domainIssues = "The domain appears to be an API key";
      } else if (!MAILGUN_DOMAIN.includes('.')) {
        domainIssues = "The domain does not contain a dot (.)";
      } else if (MAILGUN_DOMAIN.length > 100) {
        domainIssues = "The domain is too long";
      }
    } else {
      domainIssues = "Domain is not set";
    }

    // Create safe response that doesn't leak secrets
    const response = {
      domain: MAILGUN_DOMAIN || "Not set",
      domain_format_valid: domainFormatValid,
      api_key_format_valid: apiKeyFormatValid,
      api_key_set: !!MAILGUN_API_KEY,
      domain_issues: domainIssues,
      timestamp: new Date().toISOString()
    };
    
    console.log("Environment check completed:", response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Error in test_mailgun_environment function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
