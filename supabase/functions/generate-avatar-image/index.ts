import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema now includes optional referenceImageUrl
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
    const { prompt, avatarId, referenceImageUrl } = validatedData;
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    let imagePrompt: string;

    // Build the image prompt
    if (referenceImageUrl) {
      console.log('Generating avatar with reference context for:', prompt);
      
      imagePrompt = `Create a professional portrait avatar for "${prompt}".

STYLE REQUIREMENTS:
- Professional studio portrait with warm cinematic color grading
- Golden undertones, slightly desaturated timeless look
- Soft vignette effect around edges
- Dark gradient background (charcoal to black)
- Professional studio lighting: soft key light, subtle fill
- Sharp focus on face, gentle blur on background
- Dignified, contemplative expression
- Head, neck, and upper shoulders framing
- Square format suitable for circular avatar crop
- Editorial magazine portrait quality

OUTPUT: Single styled portrait. No text or borders.`;
    } else {
      console.log('Generating avatar from text prompt:', prompt);
      
      imagePrompt = `Generate a photorealistic portrait of the REAL historical figure "${prompt}".

CRITICAL - ACCURACY REQUIREMENTS:
- This MUST be ${prompt} - the actual real person, not a generic representation
- Study and replicate their EXACT facial features, bone structure, and distinctive characteristics
- If ${prompt} is a known historical/public figure, match their documented appearance precisely
- Include their characteristic attire, accessories, or styling they are known for

COMPOSITION:
- Head, neck, and upper shoulders visible
- Subject centered with adequate space for circular avatar cropping
- Face occupies approximately 60% of frame height
- Square aspect ratio, suitable for profile picture use

VISUAL STYLE (consistent with existing avatars):
- Warm cinematic color grading with golden undertones
- Soft vignette effect
- Professional studio lighting: diffused key light from front-left, subtle fill
- Rich shadows with smooth gradients
- Slightly desaturated, timeless aesthetic
- Dark gradient background (charcoal to black)
- Sharp focus on face, soft blur on shoulders/background
- Dignified, contemplative expression
- Editorial magazine portrait quality

OUTPUT: Single photorealistic portrait. No text, watermarks, or borders.`;
    }

    console.log('Calling OpenAI gpt-image-1 API');
    
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
        quality: 'high',
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error("OpenAI image generation error:", response.status, raw);

      let retryAfterSeconds: number | null = null;
      const retryHeader = response.headers.get('retry-after');
      if (retryHeader) {
        retryAfterSeconds = parseInt(retryHeader, 10);
      }

      let friendly = `Image generation failed (${response.status}).`;

      // Surface common OpenAI billing/quota errors clearly
      try {
        const parsed = JSON.parse(raw);
        const code = parsed?.error?.code as string | undefined;
        const msg = parsed?.error?.message as string | undefined;

        if (code === "billing_hard_limit_reached") {
          friendly = "OpenAI billing hard limit reached. Please add billing/credits to your OpenAI account, or switch image generation to Lovable Nano banana.";
        } else if (msg && /quota|billing/i.test(msg)) {
          friendly = msg;
        }
      } catch {
        // ignore
      }

      if (response.status === 429) {
        friendly = "Rate limit reached. Please wait a moment and try again.";
      } else if (response.status === 403) {
        friendly = "API access denied (billing/quota may be disabled).";
      } else if (response.status === 401) {
        friendly = "OpenAI API key is invalid or unauthorized.";
      }

      return new Response(
        JSON.stringify({
          error: friendly,
          status: response.status,
          retryAfterSeconds,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    // gpt-image-1 returns base64 directly
    const generatedImageData = data.data?.[0]?.b64_json;
    const imageUrl = data.data?.[0]?.url;
    
    let imageBuffer: Uint8Array;
    
    if (generatedImageData) {
      // Base64 response
      imageBuffer = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));
    } else if (imageUrl) {
      // URL response - download the image
      console.log('Downloading generated image from URL');
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to download generated image');
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      imageBuffer = new Uint8Array(arrayBuffer);
    } else {
      console.error('No image in OpenAI response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image in response');
    }

    // Upload to storage
    const fileName = `${avatarId || Date.now()}.png`;
    const filePath = `${userId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
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
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-avatar-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});