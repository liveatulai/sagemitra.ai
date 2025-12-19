import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatarId, isCustom = false } = await req.json();

    if (!avatarId) {
      return new Response(
        JSON.stringify({ error: "Avatar ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tableName = isCustom ? "user_avatars" : "avatars";

    // Get avatar's current personality
    const { data: avatar, error: avatarError } = await supabase
      .from(tableName)
      .select("personality_evolution, growth_metrics")
      .eq("id", avatarId)
      .single();

    if (avatarError || !avatar) {
      throw new Error("Avatar not found");
    }

    // Get recent reactions for this avatar
    const { data: sessions } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("avatar_id", avatarId);

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No data to analyze yet" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionIds = sessions.map(s => s.id);

    // Analyze reactions
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("reactions, content")
      .in("session_id", sessionIds)
      .eq("role", "assistant");

    let totalReactions = 0;
    let positiveReactions = 0;
    const topics = new Set<string>();

    messages?.forEach(msg => {
      if (msg.reactions && Array.isArray(msg.reactions)) {
        totalReactions += msg.reactions.length;
        // Count positive reactions (❤️, 👍, 😊, etc.)
        positiveReactions += msg.reactions.filter((r: any) => 
          ['❤️', '💖', '👍', '😊', '✨', '🙏', '💯'].includes(r.emoji)
        ).length;
      }

      // Extract topics from content (simplified)
      const words = msg.content.toLowerCase().split(/\s+/);
      const importantWords = words.filter((w: string) => w.length > 5);
      importantWords.slice(0, 3).forEach((w: string) => topics.add(w));
    });

    const positiveRatio = totalReactions > 0 ? positiveReactions / totalReactions : 0.5;

    // Get mood trends
    const { data: moods } = await supabase
      .from("mood_logs")
      .select("detected_mood, sentiment_score")
      .in("session_id", sessionIds)
      .limit(50);

    // Calculate personality adjustments
    const currentPersonality = avatar.personality_evolution || {
      empathy: 0.5,
      humor: 0.5,
      curiosity: 0.5,
      formality: 0.5
    };

    const avgSentiment = (moods?.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) || 0) / (moods?.length || 1);
    
    // Adjust personality based on feedback
    const newPersonality = {
      empathy: Math.min(1, Math.max(0, currentPersonality.empathy + (positiveRatio > 0.6 ? 0.02 : -0.01))),
      humor: Math.min(1, Math.max(0, currentPersonality.humor + (avgSentiment > 0.5 ? 0.01 : 0))),
      curiosity: Math.min(1, Math.max(0, currentPersonality.curiosity + (topics.size > 5 ? 0.02 : 0))),
      formality: Math.min(1, Math.max(0, currentPersonality.formality + (positiveRatio < 0.4 ? 0.01 : -0.01)))
    };

    const newGrowthMetrics = {
      total_reactions: totalReactions,
      positive_ratio: positiveRatio,
      topics_discussed: Array.from(topics).slice(0, 10),
      last_updated: new Date().toISOString()
    };

    // Update avatar
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        personality_evolution: newPersonality,
        growth_metrics: newGrowthMetrics
      })
      .eq("id", avatarId);

    if (updateError) throw updateError;

    // Calculate growth summary
    const empathyGrowth = ((newPersonality.empathy - currentPersonality.empathy) * 100).toFixed(1);
    const humorGrowth = ((newPersonality.humor - currentPersonality.humor) * 100).toFixed(1);
    const curiosityGrowth = ((newPersonality.curiosity - currentPersonality.curiosity) * 100).toFixed(1);

    return new Response(
      JSON.stringify({
        success: true,
        personality: newPersonality,
        growthSummary: {
          empathy: `${empathyGrowth}%`,
          humor: `${humorGrowth}%`,
          curiosity: `${curiosityGrowth}%`
        },
        metrics: newGrowthMetrics
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Personality update error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
