import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

interface FollowUpSuggestionsProps {
  sessionId: string;
  messageId?: string;
  onSelect: (suggestion: string) => void;
}

// Generate contextual suggestions based on avatar tone and last message
function generateContextualSuggestions(avatarName?: string, lastMessage?: string): string[] {
  const lowerMessage = lastMessage?.toLowerCase() || "";
  
  // Detect tone patterns
  const hasLoveTone = /love|heart|compassion|care|warm|gentle/i.test(lowerMessage);
  const hasWisdomTone = /truth|realize|understand|wisdom|path|way/i.test(lowerMessage);
  const hasPhilosophyTone = /why|meaning|purpose|essence|nature/i.test(lowerMessage);
  const hasQuestionTone = lowerMessage.includes("?");
  
  // Contextual suggestions based on detected tone
  if (hasLoveTone) {
    return ["Guide me deeper 💞", "That touched my heart 🌸", "What do you feel now? ✨"];
  }
  
  if (hasWisdomTone) {
    return ["Clarify this truth 🕊", "How do I realize this?", "Reflect further on that 🪞"];
  }
  
  if (hasPhilosophyTone) {
    return ["Explore this deeper 🌀", "What's the essence?", "Show me another angle 💫"];
  }
  
  if (hasQuestionTone) {
    return ["Let me reflect on that", "Guide me through this", "Help me understand"];
  }
  
  // Avatar-specific fallbacks
  const archetypes: Record<string, string[]> = {
    "Albert Einstein": ["Explain the physics 🔬", "Connect to reality", "The math behind this?"],
    "Ramana Maharshi": ["Who experiences this? 🕉️", "Remain as awareness", "Deeper silence"],
    "Buddha": ["Let go of this ☸️", "The practice?", "Show the middle way"],
    "Nikola Tesla": ["Energy flow? ⚡", "The pattern?", "Tell me the vibration"],
    "Steve Jobs": ["Simple truth? 🍎", "How to innovate?", "What's beautiful here?"],
    "Elon Musk": ["First principles? 🚀", "Scale this?", "The breakthrough?"],
    "Krishna": ["What's dharma? 🪷", "Act without attachment", "Tell me a story"],
    "Default": ["Tell me more", "Apply to life?", "Help me understand"]
  };
  
  return archetypes[avatarName || ""] || archetypes.Default;
}

export default function FollowUpSuggestions({ sessionId, messageId, onSelect }: FollowUpSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [avatarName, setAvatarName] = useState<string>("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadSessionAvatar();
    loadSuggestions();
    subscribeToSuggestions();
  }, [sessionId]);

  const loadSessionAvatar = async () => {
    try {
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("avatar_id")
        .eq("id", sessionId)
        .single();
      
      if (session) {
        const { data: avatar } = await supabase
          .from("avatars")
          .select("name")
          .eq("id", session.avatar_id)
          .maybeSingle();
        
        if (avatar) setAvatarName(avatar.name);
      }
    } catch (error) {
      console.error("Error loading avatar:", error);
    }
  };

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("chat_follow_up_suggestions")
        .select("suggestion")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (data && data.length > 0) {
        setSuggestions(data.map((d) => d.suggestion));
      } else {
        // Generate contextual suggestions if none from backend
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1);
        
        const lastMessage = messages?.[0]?.content;
        setSuggestions(generateContextualSuggestions(avatarName, lastMessage));
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
      setSuggestions(generateContextualSuggestions(avatarName));
    } finally {
      setLoading(false);
    }
  };

  const subscribeToSuggestions = () => {
    const channel = supabase
      .channel(`suggestions:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_follow_up_suggestions",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (loading || suggestions.length === 0) return null;

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, 3);

  const handleSelect = (suggestion: string) => {
    // Vibration feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onSelect(suggestion);
  };

  return (
    <div className="bg-secondary/30 rounded-lg border border-border/50 p-2 relative overflow-hidden">
      {/* Gradient fades on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-secondary/30 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-secondary/30 to-transparent pointer-events-none z-10" />
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Lightbulb className="h-3 w-3 animate-pulse" />
        <span>Continue the conversation:</span>
      </div>
      <div 
        className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide scroll-smooth"
      >
        {displayedSuggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleSelect(suggestion)}
            className="text-xs whitespace-nowrap shrink-0 snap-start transition-all hover:scale-105 hover:shadow-md active:scale-95"
          >
            {suggestion}
          </Button>
        ))}
        {!showAll && suggestions.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-xs whitespace-nowrap shrink-0 snap-start text-primary"
          >
            + More
          </Button>
        )}
      </div>
    </div>
  );
}
