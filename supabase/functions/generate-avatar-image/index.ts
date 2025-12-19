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
    const { prompt, avatarId, referenceImageUrl } = validatedData;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let imagePrompt: string;
    let base64ImageData: string | undefined;

    // Download reference image if provided
    if (referenceImageUrl) {
      try {
        console.log('Downloading reference image...');
        const imageResponse = await fetch(referenceImageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*',
          }
        });

        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          base64ImageData = btoa(binary);
          console.log('Successfully converted image to base64, size:', base64ImageData.length);
        }
      } catch (err) {
        console.error('Error downloading reference image:', err);
      }
    }

    // Build the image prompt
    if (base64ImageData) {
      console.log('Generating avatar from reference image');
      imagePrompt = `Transform this reference image into a professional avatar portrait for "${prompt}".

Use the person's face from the reference image as the basis.

APPLY THIS STYLE:
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

VISUAL STYLE:
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

    console.log('Calling Lovable AI with Nano banana model');

    // Build request body for Lovable AI gateway
    const messages: any[] = [];
    
    if (base64ImageData) {
      // With reference image
      messages.push({
        role: "user",
        content: [
          { type: "text", text: imagePrompt },
          { 
            type: "image_url", 
            image_url: { 
              url: `data:image/jpeg;base64,${base64ImageData}` 
            } 
          }
        ]
      });
    } else {
      // Text only
      messages.push({
        role: "user",
        content: imagePrompt
      });
    }
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages,
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error("Lovable AI error:", response.status, raw);

      let friendly = `Image generation failed (${response.status}).`;
      
      if (response.status === 429) {
        friendly = "Rate limit reached. Please try again in a moment.";
      } else if (response.status === 402) {
        friendly = "Lovable AI credits exhausted. Please add credits to your workspace.";
      } else if (response.status === 401) {
        friendly = "API key is invalid or unauthorized.";
      }

      return new Response(
        JSON.stringify({ error: friendly, status: response.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    // Extract image from response - Nano banana returns images in the message
    const images = data.choices?.[0]?.message?.images;
    let generatedImageData: string | undefined;

    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        // Extract base64 from data URL
        const base64Match = imageUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
        if (base64Match) {
          generatedImageData = base64Match[1];
        }
      }
    }

    if (!generatedImageData) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image in response');
    }

    // Convert base64 to buffer
    const imageBuffer = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));

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