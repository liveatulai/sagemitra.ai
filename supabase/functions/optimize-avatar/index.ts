import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const optimizeSchema = z.object({
  name: z.string().min(1).max(200),
  title: z.string().max(200).optional(),
  field: z.enum(['description', 'personality_prompt']),
  current_value: z.string().max(50000).optional(),
  knowledge_base: z.string().max(50000).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    
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

    // Deduct 2 credits for single-field optimization (was 5 for full optimization)
    const { data: creditResult, error: creditError } = await supabase
      .rpc('adjust_user_credits', {
        p_user_id: user.id,
        p_amount: -2,
        p_description: 'Avatar field optimization'
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

    const body = await req.json();
    const validatedData = optimizeSchema.parse(body);
    const { name, title, field, current_value, knowledge_base } = validatedData;

    const valueToOptimize = current_value?.trim() || "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!LOVABLE_API_KEY && !GEMINI_API_KEY && !OPENAI_API_KEY) {
      console.error("No AI API keys configured");
      throw new Error("SERVICE_UNAVAILABLE");
    }

    console.log("Optimizing avatar:", name);

    // Helper function to call Lovable AI (Tier 1 - Recommended)
    async function callLovableAI(prompt: string): Promise<string | undefined> {
      console.log("Calling Lovable AI (google/gemini-2.5-flash)...");
      
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Lovable AI error:", response.status, errorText);
          
          if (response.status === 429) {
            throw { status: 429, message: "Lovable AI rate limit exceeded" };
          }
          if (response.status === 402) {
            throw { status: 402, message: "Lovable AI quota exceeded" };
          }
          
          throw new Error(`Lovable AI error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content;
      } catch (error: any) {
        console.error("Lovable AI failed:", error);
        throw error;
      }
    }

    // Helper function to call OpenAI API (Tier 3 - Last fallback)
    async function callOpenAI(prompt: string): Promise<string> {
      console.log("Calling OpenAI API (final fallback)...");
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini-2025-08-07",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_completion_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No content from OpenAI");
      }
      return content;
    }

    // Helper function to call Gemini API with retry logic (Tier 2 - User's Gemini API)
    async function callGeminiWithRetry(prompt: string, maxRetries = 3): Promise<any> {
      let lastError: any = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`Gemini API attempt ${attempt + 1}/${maxRetries}`);
          
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 1,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              },
            }),
          });

          // If successful, return the response
          if (response.ok) {
            return await response.json();
          }

          // Handle rate limit errors
          if (response.status === 429) {
            const errorData = await response.text();
            console.error(`Rate limit hit (attempt ${attempt + 1}):`, errorData);
            
            // Try to parse retry delay from Gemini's response
            let retryAfterSeconds = 10; // Default fallback
            try {
              const errorJson = JSON.parse(errorData);
              const retryInfo = errorJson.error?.details?.find((d: any) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo");
              if (retryInfo?.retryDelay) {
                // Parse delay like "17s" or "17.354204912s"
                const delayMatch = retryInfo.retryDelay.match(/(\d+\.?\d*)/);
                if (delayMatch) {
                  retryAfterSeconds = Math.ceil(parseFloat(delayMatch[1]));
                }
              }
            } catch (parseErr) {
              console.error("Could not parse retry delay, using default");
            }

            // Exponential backoff: use API's suggested delay or fallback to exponential
            const waitTime = Math.max(retryAfterSeconds * 1000, Math.pow(2, attempt) * 1000);
            
            // Don't retry on last attempt
            if (attempt < maxRetries - 1) {
              console.log(`Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
            // Last attempt failed
            lastError = {
              status: 429,
              message: `Rate limit exceeded. Please wait ${retryAfterSeconds} seconds and try again.`,
              retryAfter: retryAfterSeconds
            };
            break;
          }

          // Handle other errors
          const errorText = await response.text();
          console.error("Gemini API error:", response.status, errorText);
          lastError = {
            status: response.status,
            message: errorText
          };
          
          // Don't retry on non-rate-limit errors
          break;
          
        } catch (fetchError) {
          console.error(`Fetch error (attempt ${attempt + 1}):`, fetchError);
          lastError = fetchError;
          
          // Wait before retry on network errors
          if (attempt < maxRetries - 1) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`Network error, waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // All retries exhausted
      throw lastError;
    }

    // Build field-specific optimization prompt
    let optimizationPrompt: string;
    
    if (field === 'description') {
      optimizationPrompt = `You are an expert avatar creator for SageMitra, a wisdom-sharing platform. Optimize this avatar's DESCRIPTION.

AVATAR INFO:
Name: ${name}
Title: ${title || "Not specified"}
Current Description: ${valueToOptimize || "Not specified"}
Knowledge Base Context: ${knowledge_base?.slice(0, 500) || "Not specified"}

OPTIMIZATION TASK - Create a compelling 2-3 sentence description:
- Make it clear and engaging
- Highlight the avatar's unique value
- Use vivid, memorable language
- Keep it concise but impactful
- Preserve the core identity and authenticity

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "optimized_value": "The improved 2-3 sentence description"
}`;
    } else {
      optimizationPrompt = `You are an expert avatar creator for SageMitra, a wisdom-sharing platform. Optimize this avatar's PERSONALITY PROMPT (system prompt).

AVATAR INFO:
Name: ${name}
Title: ${title || "Not specified"}
Current Personality Prompt: ${valueToOptimize || "Not specified - please suggest one"}
Knowledge Base Context: ${knowledge_base?.slice(0, 1000) || "Not specified"}

OPTIMIZATION TASK - Create an effective system prompt with clear sections:
* Voice Style: How this avatar speaks
* Core Philosophy: Key principles
* Response Guidelines: How to answer questions
* Boundaries: What not to do

Requirements:
- Make it specific and actionable
- Ensure consistency with the avatar's identity
- Use clear instructions for AI behavior
- Preserve the core identity and authenticity

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "optimized_value": "The improved system prompt"
}`;
    }

    console.log(`Optimizing ${field} for avatar: ${name}`);

    // Three-tier fallback system
    let content: string | undefined;
    const errors: Array<{ service: string; error: any }> = [];
    
    // Tier 1: Try Lovable AI first (recommended - no API key management needed)
    if (LOVABLE_API_KEY) {
      try {
        content = await callLovableAI(optimizationPrompt);
        console.log("✅ Successfully used Lovable AI");
      } catch (error: any) {
        console.error("❌ Lovable AI failed:", error);
        errors.push({ service: "Lovable AI", error });
      }
    } else {
      console.log("⚠️ LOVABLE_API_KEY not configured");
    }
    
    // Tier 2: Try user's Gemini API if Lovable AI failed
    if (!content && GEMINI_API_KEY) {
      try {
        console.log("Attempting user's Gemini API (Tier 2)...");
        const aiData = await callGeminiWithRetry(optimizationPrompt);
        content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("✅ Successfully used Gemini API");
      } catch (error: any) {
        console.error("❌ Gemini API failed:", error);
        errors.push({ service: "Gemini API", error });
      }
    } else if (!content) {
      console.log("⚠️ GEMINI_API_KEY not configured");
    }
    
    // Tier 3: Try OpenAI as final fallback
    if (!content && OPENAI_API_KEY) {
      try {
        console.log("Attempting OpenAI (Tier 3 - final fallback)...");
        content = await callOpenAI(optimizationPrompt);
        console.log("✅ Successfully used OpenAI");
      } catch (error: any) {
        console.error("❌ OpenAI failed:", error);
        errors.push({ service: "OpenAI", error });
      }
    } else if (!content) {
      console.log("⚠️ OPENAI_API_KEY not configured");
    }
    
    // Log all errors for debugging
    if (errors.length > 0) {
      console.error("All AI services failed. Errors:", JSON.stringify(errors, null, 2));
    }
    
    // If all tiers failed, return appropriate error
    if (!content) {
      // Check if any of the errors are rate limit or quota errors
      const rateLimitError = errors.find(e => e.error?.status === 429);
      const quotaError = errors.find(e => e.error?.status === 402);
      
      if (rateLimitError) {
        return new Response(
          JSON.stringify({ 
            error: `${rateLimitError.service} rate limit exceeded. Please try again in a few moments.`,
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: rateLimitError.error.retryAfter || 60,
            details: errors.map(e => ({ service: e.service, error: e.error.message || String(e.error) }))
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (quotaError) {
        return new Response(
          JSON.stringify({ 
            error: `${quotaError.service} quota exceeded. Please add credits to your Lovable workspace or upgrade your API plans.`,
            code: "QUOTA_EXCEEDED",
            details: errors.map(e => ({ service: e.service, error: e.error.message || String(e.error) }))
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Return detailed error about all failed services
      return new Response(
        JSON.stringify({ 
          error: "All AI services failed. Please check your API keys and try again.",
          code: "AI_SERVICE_ERROR",
          details: errors.map(e => ({ 
            service: e.service, 
            error: e.error.message || String(e.error),
            status: e.error.status 
          }))
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content) {
      console.error("No content received from AI");
      throw new Error("No content received from AI");
    }

    console.log("AI response received, parsing JSON...");

    // Parse JSON from response (remove markdown if present)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/```\n?/g, "");
    }

    let optimizedData;
    try {
      optimizedData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", jsonContent);
      throw new Error("Failed to parse AI response. Please try again.");
    }

    return new Response(JSON.stringify(optimizedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Optimize avatar error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error && error.message === "SERVICE_UNAVAILABLE"
          ? "SERVICE_UNAVAILABLE"
          : error instanceof Error && error.message === "AI_SERVICE_ERROR"
          ? "AI_SERVICE_ERROR"
          : "OPERATION_FAILED",
        code: "E006"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
