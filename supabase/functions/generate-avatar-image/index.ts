import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SECURITY: Removed userId from schema - use authenticated user instead
const imageGenSchema = z.object({
  prompt: z.string().min(1).max(5000),
  avatarId: z.string().uuid(),
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

    // Use authenticated user's ID instead of client-supplied userId
    const userId = user.id;

    const body = await req.json();
    const validatedData = imageGenSchema.parse(body);
    const { prompt, avatarId } = validatedData;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prompt matching existing avatar style (Einstein, Musk, Aphrodite) - head/shoulders that fit in circle
    const enhancedPrompt = `Professional portrait photograph of ${prompt}.

COMPOSITION (CRITICAL):
- Head, neck, and upper shoulders visible - NOT extreme close-up
- Subject centered, with space around the head for circular cropping
- Face takes up about 60% of frame height, leaving room for hair and shoulders
- Perfectly suited for a circular avatar crop

SUBJECT ACCURACY:
- Must be an accurate, recognizable depiction of ${prompt}
- Show their distinctive features, hairstyle, and appearance
- Historically/culturally accurate clothing and styling if applicable

VISUAL STYLE (match existing avatars):
- Cinematic color grading with warm, slightly golden undertones
- Soft vignette effect around edges
- Professional studio lighting: soft key light, subtle fill
- Rich, deep shadows with smooth gradients
- Slightly desaturated, timeless look
- Dark moody background (deep charcoal/black gradient)
- Sharp focus on face, gentle blur on shoulders
- High-end editorial magazine quality
- Thoughtful, dignified expression

OUTPUT: Photorealistic portrait only. No text, borders, or watermarks. Square format.`;

    console.log('Generating avatar portrait with Nano Banana Pro:', prompt);

    // Generate image using Lovable AI with Nano Banana Pro model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{
          role: 'user',
          content: enhancedPrompt
        }],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI image generation error:', response.status, errorText);
      
      if (response.status === 402) {
        throw new Error('Insufficient credits for image generation. Please add credits to your workspace in Settings → Workspace → Usage.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const base64Image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!base64Image) {
      console.error('No image in Lovable AI response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image in response');
    }

    // Extract base64 data
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Use authenticated userId for storage path
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
