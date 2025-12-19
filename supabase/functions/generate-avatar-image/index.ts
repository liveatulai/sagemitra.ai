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
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    let processedReferenceUrl = referenceImageUrl;
    let base64ImageData: string | undefined;

    // Validate reference image format - Gemini only supports jpg, jpeg, png, webp
    if (referenceImageUrl) {
      const lowerUrl = referenceImageUrl.toLowerCase();
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];
      const isSupported = supportedFormats.some(fmt => lowerUrl.includes(fmt));
      
      if (!isSupported) {
        // Check if it's a GIF or unsupported format
        if (lowerUrl.includes('.gif') || lowerUrl.includes('.bmp') || lowerUrl.includes('.tiff')) {
          console.log('Unsupported image format, falling back to text-only generation');
          processedReferenceUrl = undefined;
        }
      }

      // Download the image and convert to base64 to avoid 403 errors
      if (processedReferenceUrl) {
        try {
          console.log('Downloading reference image to convert to base64...');
          const imageResponse = await fetch(processedReferenceUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/*',
            }
          });

          if (imageResponse.ok) {
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            const arrayBuffer = await imageResponse.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Convert to base64
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            base64ImageData = btoa(binary);
            console.log('Successfully converted image to base64, size:', base64ImageData.length);
          } else {
            console.log('Failed to download reference image:', imageResponse.status, '- falling back to text-only');
            processedReferenceUrl = undefined;
          }
        } catch (downloadError) {
          console.error('Error downloading reference image:', downloadError);
          console.log('Falling back to text-only generation');
          processedReferenceUrl = undefined;
        }
      }
    }

    let imagePrompt: string;
    let requestBody: any;

    if (processedReferenceUrl && base64ImageData) {
      // With reference image - use image editing/transformation
      console.log('Generating avatar from reference image (base64)');
      
      imagePrompt = `Transform this reference image into a professional avatar portrait for "${prompt}".

IMPORTANT: Use the person's face from the reference image as the basis.

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

OUTPUT: Single styled portrait matching the avatar aesthetic. No text or borders.`;

      requestBody = {
        contents: [{
          parts: [
            { text: imagePrompt },
            { 
              inlineData: { 
                mimeType: "image/jpeg", 
                data: base64ImageData 
              } 
            }
          ]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        }
      };
    } else {
      // Without reference - generate from scratch
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

      requestBody = {
        contents: [{
          parts: [{ text: imagePrompt }]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        }
      };
    }

    // Generate image using Gemini Nano banana model (gemini-2.5-flash-image-preview)
    const model = "gemini-2.5-flash-preview-image-generation";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const raw = await response.text();
      console.error("Gemini image generation error:", response.status, raw);

      // Try to surface retry delay if provided by Gemini
      let retryAfterSeconds: number | null = null;
      try {
        const parsed = JSON.parse(raw);
        const retryDelay = parsed?.error?.details?.find((d: any) => d?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo")
          ?.retryDelay as string | undefined;
        if (retryDelay && typeof retryDelay === "string") {
          const match = retryDelay.match(/(\d+)/);
          if (match) retryAfterSeconds = Number(match[1]);
        }
      } catch {
        // ignore json parse errors
      }

      const friendly =
        response.status === 429
          ? "Gemini rate limit reached. Please wait a moment and try again."
          : response.status === 403
            ? "Gemini API key is not allowed to generate images (billing/quota may be disabled)."
            : response.status === 401
              ? "Gemini API key is invalid or unauthorized."
              : `Image generation failed (${response.status}).`;

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
    
    // Extract image from Gemini response
    const parts = data.candidates?.[0]?.content?.parts || [];
    let generatedImageData: string | undefined;
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        generatedImageData = part.inlineData.data;
        break;
      }
    }
    
    if (!generatedImageData) {
      console.error('No image in Gemini response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image in response');
    }

    // Convert base64 to buffer
    const imageBuffer = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));

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
