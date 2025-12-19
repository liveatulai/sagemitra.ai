import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { sanitizeTextForTTS } from "@/lib/sanitizeEmoji";

interface TTSButtonProps {
  text: string;
  emotion?: "calm" | "curious" | "joyful" | "reflective" | "loving";
  avatarType?: string;
}

export default function TTSButton({ text, emotion = "calm", avatarType }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  // Get ambient sound settings
  const ambientEnabled = localStorage.getItem("ambient_sound_enabled") !== "false";

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current = null;
      }
    };
  }, []);

  const addNaturalPauses = (text: string): string => {
    return text
      .replace(/\. /g, "... ")
      .replace(/\? /g, "?.. ")
      .replace(/! /g, "!.. ");
  };

  const getEmotionTone = (emotion: string) => {
    switch (emotion) {
      case "joyful": return { rate: 1.1, pitch: 1.2 };
      case "curious": return { rate: 1.0, pitch: 1.1 };
      case "reflective": return { rate: 0.85, pitch: 0.95 };
      case "loving": return { rate: 0.9, pitch: 1.05 };
      case "calm": 
      default: return { rate: 0.9, pitch: 1.0 };
    }
  };

  const playAmbientSound = () => {
    if (!ambientEnabled || !avatarType) return;

    // Map avatar types to ambient sounds (you'd need actual audio files)
    const ambientMap: Record<string, string> = {
      "buddha": "/ambient/temple-bell.mp3",
      "einstein": "/ambient/lab-hum.mp3",
      "aphrodite": "/ambient/wind.mp3"
    };

    const soundUrl = ambientMap[avatarType.toLowerCase()];
    if (soundUrl) {
      try {
        ambientAudioRef.current = new Audio(soundUrl);
        ambientAudioRef.current.volume = 0.15;
        ambientAudioRef.current.loop = true;
        ambientAudioRef.current.play().catch(() => {
          // Autoplay blocked - user interaction required
        });
      } catch (error) {
        console.error("Ambient sound error:", error);
      }
    }
  };

  const stopAmbientSound = () => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
      ambientAudioRef.current = null;
    }
  };

  const handleTTS = () => {
    if (!window.speechSynthesis) {
      toast("Audio not available", { description: "Text-to-speech is not supported in this browser" });
      return;
    }

    // Stop current playback
    if (isPlaying && utterance) {
      window.speechSynthesis.cancel();
      stopAmbientSound();
      setIsPlaying(false);
      setUtterance(null);
      return;
    }

    // Create new utterance with sanitized text and natural pauses
    const sanitizedText = sanitizeTextForTTS(text);
    const textWithPauses = addNaturalPauses(sanitizedText);
    const newUtterance = new SpeechSynthesisUtterance(textWithPauses);
    
    const tone = getEmotionTone(emotion);
    newUtterance.rate = tone.rate;
    newUtterance.pitch = tone.pitch;
    newUtterance.volume = 1;
    
    newUtterance.onend = () => {
      setIsPlaying(false);
      setUtterance(null);
      stopAmbientSound();
    };
    
    newUtterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsPlaying(false);
      setUtterance(null);
      stopAmbientSound();
      toast("Audio playback failed", { description: "Please try again" });
    };

    // Start playback with ambient sound
    try {
      playAmbientSound();
      window.speechSynthesis.speak(newUtterance);
      setUtterance(newUtterance);
      setIsPlaying(true);
    } catch (error) {
      console.error("Failed to start speech:", error);
      stopAmbientSound();
      toast("Audio not available", { description: "Please try again" });
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className={`h-7 px-2.5 transition-all ${isPlaying ? 'tts-glow' : ''}`}
      onClick={handleTTS}
      title={isPlaying ? "Stop" : "Voice"}
    >
      {isPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
