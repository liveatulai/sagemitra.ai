import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get session and messages
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("avatar_id, user_id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get last 50 messages
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages to summarize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reverse to get chronological order
    const chronologicalMessages = messages.reverse();

    // Build context for summarization
    const conversationText = chronologicalMessages
      .map((m) => `${m.role === "user" ? "User" : "Avatar"}: ${m.content}`)
      .join("\n");

    // Use Gemini API to summarize
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = "You are an expert at creating concise, emotionally-aware conversation summaries. Summarize the key emotional themes, insights, and unresolved topics from conversations in 150-200 characters. Focus on continuity for future sessions.";

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: `Summarize this conversation:\n\n${conversationText}` }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 200 },
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI summarization failed");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Detect emotional context
    const emotionalKeywords = {
      contemplative: ["reflect", "ponder", "think", "wonder", "consider"],
      seeking: ["search", "seek", "find", "discover", "explore"],
      troubled: ["struggle", "difficult", "pain", "hurt", "torn"],
      peaceful: ["calm", "peace", "serene", "tranquil", "content"],
    };

    let emotionalContext = "neutral";
    const lowerContent = conversationText.toLowerCase();

    for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
      if (keywords.some((kw) => lowerContent.includes(kw))) {
        emotionalContext = emotion;
        break;
      }
    }

    // Store memory
    const { error: insertError } = await supabase.from("avatar_memory").insert({
      user_id: user.id,
      avatar_id: session.avatar_id,
      session_id: sessionId,
      memory_summary: summary.substring(0, 200),
      emotional_context: emotionalContext,
      message_count: messages.length,
    });

    if (insertError) {
      console.error("Error storing memory:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store memory" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        emotionalContext,
        messageCount: messages.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Summarization error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
