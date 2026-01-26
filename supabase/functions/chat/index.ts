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
  isWelcome: z.boolean().optional().default(false),
});

// Helper function to call Gemini API directly
async function callGeminiAPI(systemPrompt: string, messages: Array<{role: string, content: string}>, apiKey: string) {
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    }),
  });

  return response;
}

function classifyGemini429(errorText: string) {
  // Gemini/Vertex can return HTTP 429 for multiple reasons:
  // - transient rate limiting (retry/backoff helps)
  // - quota/billing issues (retry won't help)
  // IMPORTANT: The string "RESOURCE_EXHAUSTED" is commonly returned for *rate limiting*
  // as well, so we do NOT treat it as a billing/quota exhausted signal by itself.

  const raw = (errorText || "").trim();
  let normalized = raw;

  // Try to parse JSON error payloads so we can inspect the message more reliably.
  try {
    const parsed = JSON.parse(raw);
    const msg = parsed?.error?.message ?? "";
    const status = parsed?.error?.status ?? "";
    normalized = `${status} ${msg} ${raw}`;
  } catch {
    // ignore
  }

  const t = normalized.toLowerCase();

  // Strong signals that it's NOT just transient throttling.
  const looksLikeQuotaOrBilling =
    t.includes("check your plan and billing details") ||
    t.includes("billing") ||
    t.includes("payment required") ||
    t.includes("quota exceeded") ||
    t.includes("insufficient quota") ||
    t.includes("limit: 0");

  if (looksLikeQuotaOrBilling) return { kind: "quota" as const };
  return { kind: "rate_limit" as const };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validatedData = chatRequestSchema.parse(body);
    const { sessionId, message, avatarId, isWelcome } = validatedData;

    if (!sessionId || !message || !avatarId) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Gemini API key directly
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
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

    // Deduct 1 credit for chat message (skip for welcome messages)
    if (!isWelcome) {
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
    const messages = [];

    // Add conversation history (skip for welcome messages since there's no history)
    if (!isWelcome) {
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    // Add current message - for welcome, use a special greeting prompt
    if (isWelcome) {
      messages.push({ 
        role: "user", 
        content: `Generate a brief, warm welcoming message (max 50 words) to greet someone who just started a conversation with you. Be warm, inviting, and stay in character. Do not ask them to tell you about themselves - instead offer your wisdom or ask what brings them to you.`
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    // Call Gemini API directly
    const aiResponse = await callGeminiAPI(systemPrompt, messages, GEMINI_API_KEY);

    if (!aiResponse.ok) {
      let errorText = "";
      try {
        errorText = await aiResponse.text();
      } catch {
        errorText = "Unknown error";
      }
      
      console.error("Gemini API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        const classification = classifyGemini429(errorText);

        if (classification.kind === "quota") {
          return new Response(
            JSON.stringify({
              error: "AI quota/billing exhausted for the configured provider key.",
              code: "AI_QUOTA_EXHAUSTED",
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a few moments.",
            code: "E004",
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
    const assistantMessage = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

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

    // Generate follow-up suggestions (also for welcome messages to help user get started)
    const suggestionsContext = isWelcome 
      ? `This is a welcome message from ${avatar.name}. Suggest 3 conversation starters.`
      : `User: ${message}`;
    
    const suggestionsPrompt = `Based on this conversation, suggest 3 brief follow-up questions (max 8 words each) the user might ask. Return ONLY a JSON array of strings, nothing else.

Recent context:
${suggestionsContext}
Assistant: ${assistantMessage}`;

    try {
      const suggestionsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: suggestionsPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 150 },
        }),
      });

      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        const suggestionsText = suggestionsData.candidates?.[0]?.content?.parts?.[0]?.text;
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
