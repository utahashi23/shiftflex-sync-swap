
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"

// Set up CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  template?: string;
  templateVariables?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key and domain from environment variables
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');
    
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      throw new Error('Missing Mailgun configuration (API key or domain)');
    }

    // Get email data from request
    const { to, subject, text, html, from, template, templateVariables, cc, bcc, replyTo } = await req.json() as EmailPayload;
    
    // Validation
    if (!to || !subject || (!text && !html && !template)) {
      throw new Error('Missing required email parameters (to, subject, and either text, html, or template)');
    }

    // Prepare request
    const formData = new FormData();
    
    // Add required fields
    const recipients = Array.isArray(to) ? to : [to];
    recipients.forEach(recipient => formData.append('to', recipient));
    
    formData.append('subject', subject);
    
    // Default from address using the domain
    formData.append('from', from || `Shift Swap <notifications@${MAILGUN_DOMAIN}>`);
    
    // Add content
    if (text) formData.append('text', text);
    if (html) formData.append('html', html);
    
    // Add optional fields
    if (replyTo) formData.append('h:Reply-To', replyTo);
    
    // Add CC recipients if provided
    if (cc) {
      const ccRecipients = Array.isArray(cc) ? cc : [cc];
      ccRecipients.forEach(recipient => formData.append('cc', recipient));
    }
    
    // Add BCC recipients if provided
    if (bcc) {
      const bccRecipients = Array.isArray(bcc) ? bcc : [bcc];
      bccRecipients.forEach(recipient => formData.append('bcc', recipient));
    }
    
    // Handle template if provided
    if (template && templateVariables) {
      formData.append('template', template);
      formData.append('h:X-Mailgun-Variables', JSON.stringify(templateVariables));
    }
    
    console.log(`Sending email to ${Array.isArray(to) ? to.join(', ') : to} with subject "${subject}"`);
    
    // Send the email using Mailgun API
    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa('api:' + MAILGUN_API_KEY)}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mailgun API error: ${response.status}`, errorText);
      throw new Error(`Mailgun API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Email sent successfully:', result);
    
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
