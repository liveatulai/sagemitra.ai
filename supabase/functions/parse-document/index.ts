import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    let content = '';

    if (fileName.endsWith('.pdf')) {
      // For PDFs, we'll use a simple extraction approach
      // In production, you'd want to use a proper PDF parsing library
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const textDecoder = new TextDecoder('utf-8');
      
      // Try to extract text from PDF (basic approach)
      // This works for simple PDFs with embedded text
      const pdfText = textDecoder.decode(uint8Array);
      
      // Extract text between stream markers (basic PDF text extraction)
      const textMatches = pdfText.match(/\(([^)]+)\)/g);
      if (textMatches) {
        content = textMatches
          .map(match => match.slice(1, -1))
          .join(' ')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\/g, '');
      } else {
        // Fallback: try to extract readable ASCII text
        content = pdfText.replace(/[^\x20-\x7E\n]/g, ' ').trim();
      }
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      // For DOCX files, we need to extract from the ZIP structure
      // For now, provide a basic text extraction
      const text = await file.text();
      
      // Try to extract readable text from Word file structure
      const cleanText = text
        .replace(/<[^>]*>/g, ' ')  // Remove XML tags
        .replace(/[^\x20-\x7E\n]/g, ' ')  // Keep only printable ASCII
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();
      
      content = cleanText;
    } else {
      // For other text files
      content = await file.text();
    }

    // Clean up and limit content length
    content = content
      .trim()
      .slice(0, 50000); // Limit to 50k characters

    if (!content || content.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not extract text from document. Please ensure the document contains readable text.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to parse document' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
