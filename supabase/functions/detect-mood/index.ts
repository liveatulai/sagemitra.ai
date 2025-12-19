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
    const { messageText, sessionId, messageId } = await req.json();

    if (!messageText || !sessionId || !messageId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mood detection keywords
    const moodKeywords = {
      joyful: ["happy", "excited", "joy", "wonderful", "amazing", "love", "great", "fantastic", "yay", "haha"],
      calm: ["peace", "serene", "quiet", "relax", "breathe", "stillness", "gentle", "soft"],
      curious: ["why", "how", "what", "wonder", "explore", "learn", "discover", "question"],
      reflective: ["think", "ponder", "consider", "reflect", "contemplate", "meaning", "deeper"],
      loving: ["love", "care", "cherish", "heart", "tender", "affection", "warmth", "embrace"],
      anxious: ["worry", "stress", "anxious", "nervous", "afraid", "scared", "concern", "tense"],
      sad: ["sad", "hurt", "pain", "grief", "loss", "lonely", "empty", "down"]
    };

    // Detect mood based on keywords
    let detectedMood = "calm";
    let maxCount = 0;
    const foundKeywords: string[] = [];
    const lowerText = messageText.toLowerCase();

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      const count = keywords.filter(kw => lowerText.includes(kw)).length;
      keywords.forEach(kw => {
        if (lowerText.includes(kw)) foundKeywords.push(kw);
      });
      
      if (count > maxCount) {
        maxCount = count;
        detectedMood = mood;
      }
    }

    // Use Lovable AI for more sophisticated sentiment analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let sentimentScore = 0.5;

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Analyze the emotional sentiment of the following text. Return ONLY a number between -1 (very negative) and 1 (very positive). Example: 0.8"
              },
              {
                role: "user",
                content: messageText
              }
            ],
            temperature: 0.3
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const scoreText = aiData.choices?.[0]?.message?.content?.trim();
          const parsedScore = parseFloat(scoreText);
          if (!isNaN(parsedScore)) {
            sentimentScore = Math.max(-1, Math.min(1, parsedScore));
          }
        }
      } catch (error) {
        console.error("AI sentiment analysis failed:", error);
      }
    }

    // Adjust mood based on sentiment score
    if (sentimentScore < -0.5 && detectedMood === "calm") {
      detectedMood = "sad";
    } else if (sentimentScore > 0.7 && detectedMood === "calm") {
      detectedMood = "joyful";
    }

    // Store mood log
    const { error: logError } = await supabase
      .from("mood_logs")
      .insert({
        session_id: sessionId,
        message_id: messageId,
        detected_mood: detectedMood,
        sentiment_score: sentimentScore,
        keywords: foundKeywords
      });

    if (logError) {
      console.error("Failed to store mood log:", logError);
    }

    return new Response(
      JSON.stringify({
        mood: detectedMood,
        sentiment: sentimentScore,
        keywords: foundKeywords
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mood detection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
