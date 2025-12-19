import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const imageGenSchema = z.object({
  prompt: z.string().min(1).max(5000),
  avatarId: z.string().uuid(),
  referenceImageUrl: z.string().url().optional(),
});

serve(async (req) => {
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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    const userId = user.id;

    const body = await req.json();
    const validatedData = imageGenSchema.parse(body);
    const { prompt, avatarId } = validatedData;
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Build the image prompt
    const imagePrompt = `Generate a photorealistic portrait of "${prompt}".

COMPOSITION:
- Head, neck, and upper shoulders visible
- Subject centered, suitable for circular avatar cropping
- Face occupies approximately 60% of frame height
- Square aspect ratio for profile picture use

VISUAL STYLE:
- Warm cinematic color grading with golden undertones
- Soft vignette effect
- Professional studio lighting: diffused key light, subtle fill
- Rich shadows with smooth gradients
- Slightly desaturated, timeless aesthetic
- Dark gradient background (charcoal to black)
- Sharp focus on face, soft blur on shoulders/background
- Dignified, contemplative expression
- Editorial magazine portrait quality

Single photorealistic portrait. No text, watermarks, or borders.`;

    console.log('Calling Gemini API for image generation:', prompt);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Call Gemini API (retry on 429 with exponential backoff)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`;

    let response: Response | null = null;
    let lastRetryAfterHeader: string | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: imagePrompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["image", "text"],
          },
        }),
      });

      if (response.status !== 429) break;

      // If this was the last attempt, don't consume the body here;
      // we'll read it once after the loop for consistent error handling.
      if (attempt === 2) break;

      // Backoff with jitter (0.5s, 1.5s, 3.5s approx)
      const baseDelayMs = [500, 1500, 3500][attempt] ?? 3500;
      const jitterMs = Math.floor(Math.random() * 250);
      lastRetryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = lastRetryAfterHeader ? Number(lastRetryAfterHeader) : null;
      const delayMs = retryAfterSeconds && Number.isFinite(retryAfterSeconds)
        ? Math.max(baseDelayMs, retryAfterSeconds * 1000)
        : baseDelayMs + jitterMs;

      // Consume body to allow retry (discard content)
      await response.text().catch(() => {});
      console.warn(`Gemini 429 rate limit (attempt ${attempt + 1}/3). Waiting ${delayMs}ms.`);
      await sleep(delayMs);
    }

    if (!response) {
      return new Response(
        JSON.stringify({ error: 'Image generation failed. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read body once after loop
    const responseText = await response.text();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, responseText);

      if (response.status === 429) {
        // Provide a hint to the client for nicer UX
        const retryAfterSeconds = lastRetryAfterHeader ? Number(lastRetryAfterHeader) : 5;

        return new Response(
          JSON.stringify({
            error: "Rate limit reached. Please try again in a moment.",
            retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 5,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Gemini API key is invalid or lacks permissions." }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let errorMessage = `Image generation failed (${response.status}).`;
      try {
        const parsed = JSON.parse(responseText);
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch {}

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(responseText);
    console.log('Gemini response received');

    // Extract image from Gemini response
    // Format: candidates[0].content.parts[].inlineData.data (base64)
    let imageBase64: string | undefined;
    
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 1000));
      throw new Error('No image generated. Please try again.');
    }

    const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    // Upload to storage
    const fileName = `${avatarId || Date.now()}.png`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatar-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatar-images')
      .getPublicUrl(filePath);

    console.log('Image generated and uploaded successfully:', publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in generate-avatar-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
