import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SECURITY: Removed userId from schema - use authenticated user instead
const createAvatarSchema = z.object({
  messages: z.array(z.object({
    role: z.string(),
    content: z.string().max(5000),
  })).max(50),
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

    // userId is now derived from authenticated user
    const userId = user.id;

    const body = await req.json();
    const validatedData = createAvatarSchema.parse(body);
    const { messages } = validatedData;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('SERVICE_UNAVAILABLE');
    }

    // Use AI to generate structured avatar profile from conversation
    const systemPrompt = `You are an AI avatar creator. Based on the user's description, create a detailed avatar profile.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "name": "Full name of the avatar",
  "title": "Short title (e.g., 'Stoic Emperor', 'Quantum Physicist')",
  "category": "sage" or "scientist" or "creator",
  "description": "2-3 sentence biography",
  "personality_prompt": "Detailed personality description in 2nd person ('You are...')",
  "persona_profile": {
    "voice_style": "How they speak (tone, pace, metaphors)",
    "core_philosophy": "Their fundamental worldview",
    "modern_translation_rules": "How to apply wisdom to 2025 context",
    "prohibited_behaviors": "What they would never say/do",
    "bonding_style": "reflective/mentor-like/playful",
    "reminder_frequency": "every 3 sessions",
    "memory_tone": "gentle/strategic/enthusiastic",
    "example_scenarios": {
      "anxiety": "Example response",
      "relationships": "Example response",
      "career": "Example response"
    }
  },
  "knowledge_base": "Optional extended knowledge about this person",
  "image_prompt": "Detailed description for AI image generation (portrait style, era, look)"
}

Make it authentic, detailed, and ready for real conversations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let avatarProfile;
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      avatarProfile = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse avatar profile from AI response');
    }

    return new Response(
      JSON.stringify({ profile: avatarProfile }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in create-avatar function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error && error.message === 'SERVICE_UNAVAILABLE' 
          ? 'SERVICE_UNAVAILABLE' 
          : 'OPERATION_FAILED',
        code: 'E003'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});