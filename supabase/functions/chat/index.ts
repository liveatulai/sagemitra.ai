import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY: Only accept avatarId from client - personality data must come from database
const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(10000),
  avatarId: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validatedData = chatRequestSchema.parse(body);
    const { sessionId, message, avatarId } = validatedData;

    if (!sessionId || !message || !avatarId) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SERVICE_UNAVAILABLE', code: 'E001' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct 1 credit for chat message
    const { data: creditResult, error: creditError } = await supabase
      .rpc('adjust_user_credits', {
        p_user_id: user.id,
        p_amount: -1,
        p_description: 'Chat message'
      });

    if (creditError || !creditResult?.success) {
      console.error('Credit deduction failed:', creditError || creditResult?.error);
      return new Response(
        JSON.stringify({ 
          error: creditResult?.error || 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS'
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Robust avatar lookup: (a) user_avatars, (b) avatars
    let avatar = null;
    let knowledgeBase = null;
    let lookupPath = "";

    // (a) Try user_avatars first (user-created avatars)
    const { data: userAvatar } = await supabase
      .from("user_avatars")
      .select("name, persona_profile, personality_prompt, knowledge_base, image_url")
      .eq("id", avatarId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (userAvatar) {
      avatar = userAvatar;
      knowledgeBase = userAvatar.knowledge_base;
      lookupPath = "user_avatars.id";
    }

    // (b) Try default avatars table
    if (!avatar) {
      const { data: defaultAvatar } = await supabase
        .from("avatars")
        .select("name, persona_profile, personality_prompt, knowledge_base, image_url")
        .eq("id", avatarId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (defaultAvatar) {
        avatar = defaultAvatar;
        knowledgeBase = defaultAvatar.knowledge_base;
        lookupPath = "avatars.id";
      }
    }

    if (!avatar) {
      console.error(`Avatar not found. avatarId: ${avatarId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Avatar not found', 
          code: 'AVATAR_NOT_FOUND',
          details: `No active avatar found with id ${avatarId}`
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Avatar loaded via ${lookupPath}:`, avatar.name);

    // Get conversation history (last 10 messages for context)
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(10);

    const recentHistory = history ? history.reverse() : [];
    const messageCount = recentHistory.length;

    // Modern Context Adapter prompt with emoji guidance
    const modernContextPrompt = `
[MODERN CONTEXT ADAPTER - 2025]
Understand the user's concern within 21st-century context:
- Mental health (anxiety, burnout, overthinking, therapy culture)
- Relationships (dating apps, ghosting, attachment styles, modern loneliness)
- Technology (social media addiction, AI anxiety, screen time, digital distraction)
- Work (remote work, gig economy, purpose crisis, hustle culture)
- Identity (self-worth, comparison culture, authenticity seeking)

Bridge timeless wisdom to modern realities.
Use contemporary language and relatable metaphors from daily life.
Stay authentic to core philosophy.
Never fabricate stories, quotes, or mystical claims.

IMPORTANT: Add 1-3 relevant emojis naturally in your response to match the tone and emotion (e.g., 😊 for warmth, 🌟 for inspiration, 💭 for reflection, 🎯 for focus, ❤️ for compassion).

Max 300 words per response to avoid cutoff.
`;

    // SECURITY: Use personality_prompt from database, NOT from client request
    const dbPersonalityPrompt = avatar.personality_prompt;
    let systemPrompt = `${dbPersonalityPrompt}\n\n${modernContextPrompt}`;

    if (avatar?.persona_profile) {
      const profile = avatar.persona_profile;
      systemPrompt += `

PERSONA PROFILE:
- Voice Style: ${profile.voice_style}
- Core Philosophy: ${profile.core_philosophy}
- Modern Translation: ${profile.modern_translation_rules}
- Guardrails: ${profile.prohibited_behaviors}

RESPONSE STRUCTURE (Internal - Follow This):
1. Timeless Core: Share wisdom principle in your authentic voice
2. Modern Bridge: Translate to relatable 2025 context with specific examples  
3. Warm Close: End with empathetic reflection or gentle action point

BONDING STYLE: ${profile.bonding_style}`;

      // Add bonding reminder every 3-4 messages
      if (messageCount > 0 && messageCount % 3 === 0) {
        systemPrompt += `\n\nREMINDER: Reference something from earlier in this conversation to show continuity. Use your ${profile.memory_tone} tone.`;
      }
    }

    // Add knowledge base if available (only for user_avatars)
    if (knowledgeBase) {
      systemPrompt += `\n\nKNOWLEDGE BASE:\n${knowledgeBase}`;
    }

    // SECURITY: Use avatar name from database
    systemPrompt += `\n\nYou are ${avatar.name}. Stay in character and provide thoughtful, wise responses that reflect your personality and teachings.`;

    // Format conversation history for the AI
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Call Lovable AI API (OpenAI-compatible endpoint)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      let errorText = "";
      try {
        errorText = await aiResponse.text();
      } catch {
        errorText = "Unknown error";
      }
      
      console.error("Lovable AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a few moments.",
            code: "E004" 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'AI service error',
          code: 'E003',
          details: `API returned status ${aiResponse.status}`
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      console.error("No message in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ 
          error: "Failed to get response from AI",
          code: 'E003'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save assistant response
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: assistantMessage,
    });

    // Generate follow-up suggestions
    const suggestionsPrompt = `Based on this conversation, suggest 3 brief follow-up questions (max 8 words each) the user might ask. Return ONLY a JSON array of strings, nothing else.

Recent context:
User: ${message}
Assistant: ${assistantMessage}`;

    try {
      const suggestionsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: suggestionsPrompt }],
          temperature: 0.8,
          max_tokens: 150,
        }),
      });

      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        const suggestionsText = suggestionsData.choices?.[0]?.message?.content;
        if (suggestionsText) {
          const suggestions = JSON.parse(suggestionsText.replace(/```json\n?|\n?```/g, ''));
          
          // Save suggestions to database
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            await supabase.from("chat_follow_up_suggestions").insert(
              suggestions.slice(0, 3).map((s: string) => ({
                session_id: sessionId,
                suggestion: s,
              }))
            );
          }
        }
      }
    } catch (e) {
      console.log("Failed to generate suggestions:", e);
      // Non-critical, continue
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: assistantMessage,
      _debug: {
        avatarLookupPath: lookupPath,
        avatarName: avatar.name,
        hasKnowledgeBase: !!knowledgeBase
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
