import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MoodIndicatorProps {
  mood: "calm" | "curious" | "joyful" | "reflective" | "loving" | "anxious" | "sad";
  sentiment?: number;
  className?: string;
}

export default function MoodIndicator({ mood, sentiment, className }: MoodIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => setIsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [mood]);

  const getMoodConfig = () => {
    switch (mood) {
      case "joyful":
        return { emoji: "💫", label: "Joyful", color: "text-yellow-500" };
      case "calm":
        return { emoji: "🌊", label: "Calm", color: "text-blue-500" };
      case "curious":
        return { emoji: "✨", label: "Curious", color: "text-purple-500" };
      case "reflective":
        return { emoji: "🌙", label: "Reflective", color: "text-indigo-500" };
      case "loving":
        return { emoji: "💖", label: "Loving", color: "text-pink-500" };
      case "anxious":
        return { emoji: "😰", label: "Anxious", color: "text-orange-500" };
      case "sad":
        return { emoji: "😔", label: "Sad", color: "text-gray-500" };
      default:
        return { emoji: "✨", label: "Neutral", color: "text-gray-400" };
    }
  };

  const config = getMoodConfig();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300",
            "bg-background/80 backdrop-blur-sm border shadow-sm",
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
            config.color,
            className
          )}
        >
          <span className="text-base">{config.emoji}</span>
          <span className="hidden sm:inline">{config.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">{config.label} Mood</p>
          {sentiment !== undefined && (
            <p className="text-xs text-muted-foreground">
              Sentiment: {(sentiment * 100).toFixed(0)}%
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
