import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fetchKnowledgeSchema = z.object({
  url: z.string().url().max(2048),
});

const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_IP_RANGES.some(pattern => pattern.test(hostname));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const validatedData = fetchKnowledgeSchema.parse(body);
    const { url } = validatedData;

    console.log('Fetching content from URL');

    // Validate URL security
    const urlObj = new URL(url);
    
    // Block non-HTTP(S) schemes
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      console.error("Invalid protocol attempted:", urlObj.protocol);
      throw new Error("INVALID_URL");
    }
    
    // Block private IP ranges (SSRF protection)
    if (isBlockedHost(urlObj.hostname)) {
      console.error("Blocked hostname attempted:", urlObj.hostname);
      throw new Error("INVALID_URL");
    }

    // Fetch the website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SageMitra/1.0; +https://sagemitra.app)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      throw new Error("FETCH_FAILED");
    }

    const html = await response.text();
    
    // Simple HTML to text conversion
    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limit to first 10,000 characters to avoid overwhelming the knowledge base
    const maxLength = 10000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    console.log('Extracted text length:', text.length);

    return new Response(
      JSON.stringify({ content: text, sourceUrl: url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching knowledge from URL:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error && error.message === "INVALID_URL"
          ? "INVALID_URL"
          : error instanceof Error && error.message === "FETCH_FAILED"
          ? "FETCH_FAILED"
          : "OPERATION_FAILED",
        code: "E007"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});