import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MoodGestureProps {
  mood: "calm" | "curious" | "joyful" | "reflective" | "loving";
  className?: string;
}

export default function MoodGesture({ mood, className }: MoodGestureProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, [mood]);

  const getMoodAnimation = () => {
    switch (mood) {
      case "calm":
        return "mood-calm";
      case "curious":
        return "mood-curious";
      case "joyful":
        return "mood-joyful";
      case "reflective":
        return "mood-reflective";
      case "loving":
        return "mood-loving";
      default:
        return "mood-calm";
    }
  };

  const getMoodEmoji = () => {
    switch (mood) {
      case "calm": return "🌊";
      case "curious": return "✨";
      case "joyful": return "💫";
      case "reflective": return "🌙";
      case "loving": return "💖";
      default: return "✨";
    }
  };

  return (
    <div 
      className={cn(
        "absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all duration-500",
        getMoodAnimation(),
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-0",
        className
      )}
    >
      {getMoodEmoji()}
    </div>
  );
}
