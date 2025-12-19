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
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build the image prompt
    const imagePrompt = `Photorealistic portrait of "${prompt}".

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

    console.log('Calling OpenAI gpt-image-1 for image generation:', prompt);

    // Call OpenAI Image Generation API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium'
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error("OpenAI API error:", response.status, raw);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key is invalid." }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let errorMessage = `Image generation failed (${response.status}).`;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch {}

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received');

    // gpt-image-1 returns base64 in data[0].b64_json
    const b64 = data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;

    let imageBuffer: Uint8Array | undefined;

    if (b64) {
      imageBuffer = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    } else if (url) {
      const imgResp = await fetch(url);
      if (!imgResp.ok) {
        throw new Error(`Failed to download generated image (${imgResp.status})`);
      }
      imageBuffer = new Uint8Array(await imgResp.arrayBuffer());
    }

    if (!imageBuffer) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image generated. Please try again.');
    }

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
