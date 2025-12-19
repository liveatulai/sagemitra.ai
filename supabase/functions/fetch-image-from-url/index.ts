import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY: Removed userId from schema - use authenticated user instead
const fetchImageSchema = z.object({
  imageUrl: z.string().url().max(2048),
  avatarId: z.string().uuid(),
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
  if (req.method === "OPTIONS") {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use authenticated user's ID
    const userId = user.id;

    const body = await req.json();
    const validatedData = fetchImageSchema.parse(body);
    const { imageUrl, avatarId } = validatedData;

    console.log("Fetching image from URL");

    // Validate URL format and security
    const url = new URL(imageUrl);
    
    // Block non-HTTP(S) schemes
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are allowed");
    }
    
    // Block private IP ranges (SSRF protection)
    if (isBlockedHost(url.hostname)) {
      throw new Error("Access to private networks is not allowed");
    }

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SageMitra/1.0",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error("URL does not point to an image");
    }

    // Get the image data
    const imageBlob = await response.blob();
    
    // Check file size (max 5MB)
    if (imageBlob.size > 5 * 1024 * 1024) {
      throw new Error("Image size exceeds 5MB limit");
    }

    // Get file extension from content type
    const extension = contentType.split("/")[1].split(";")[0];
    const fileName = `${avatarId}-${Date.now()}.${extension}`;
    // SECURITY: Always use authenticated user's ID for storage path
    const filePath = `${userId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatar-images")
      .upload(filePath, imageBlob, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatar-images")
      .getPublicUrl(filePath);

    console.log("Image uploaded successfully:", publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching image from URL:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
