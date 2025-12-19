import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sanitizeTextForTTS } from "@/lib/sanitizeEmoji";

interface TTSButtonProps {
  text: string;
  emotion?: "calm" | "curious" | "joyful" | "reflective" | "loving";
  avatarType?: string;
}

export default function TTSButton({ text, emotion = "calm", avatarType }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis?.getVoices() || [];
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    // Load voices immediately
    loadVoices();

    // Chrome loads voices asynchronously
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
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
      case "joyful": return { rate: 1.05, pitch: 1.1 };
      case "curious": return { rate: 1.0, pitch: 1.05 };
      case "reflective": return { rate: 0.9, pitch: 0.95 };
      case "loving": return { rate: 0.92, pitch: 1.02 };
      case "calm": 
      default: return { rate: 0.95, pitch: 1.0 };
    }
  };

  const stopPlayback = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const handleTTS = useCallback(() => {
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech not supported", {
        description: "Please use Chrome, Safari, or Edge browser",
      });
      return;
    }

    // Stop current playback
    if (isPlaying || isLoading) {
      stopPlayback();
      return;
    }

    // Sanitize and prepare text
    const sanitizedText = sanitizeTextForTTS(text);
    let textToSpeak = addNaturalPauses(sanitizedText).trim();

    if (!textToSpeak) {
      toast.info("Nothing to read");
      return;
    }

    // Web Speech can fail on very long utterances; keep this conservative.
    const MAX_CHARS = 1200;
    if (textToSpeak.length > MAX_CHARS) {
      textToSpeak = textToSpeak.slice(0, MAX_CHARS);
      toast.info("Reading a shorter excerpt", {
        description: "This message is long, so we're reading the first part.",
        duration: 2500,
      });
    }

    setIsLoading(true);

    try {
      // IMPORTANT: keep speak() synchronous with the click handler (some browsers fail otherwise)
      window.speechSynthesis.cancel();

      const newUtterance = new SpeechSynthesisUtterance(textToSpeak);
      utteranceRef.current = newUtterance;

      const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const preferredVoice =
        currentVoices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
        currentVoices.find(
          (v) => v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Daniel"))
        ) ||
        currentVoices.find((v) => v.lang.startsWith("en")) ||
        currentVoices[0];

      if (preferredVoice) newUtterance.voice = preferredVoice;

      const tone = getEmotionTone(emotion);
      newUtterance.rate = tone.rate;
      newUtterance.pitch = tone.pitch;
      newUtterance.volume = 1;

      newUtterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      newUtterance.onend = () => {
        setIsPlaying(false);
        setIsLoading(false);
        utteranceRef.current = null;
      };

      newUtterance.onerror = (event: any) => {
        // Some browsers only provide event.error, some don't.
        console.error("Speech synthesis error:", event?.error || event);
        setIsPlaying(false);
        setIsLoading(false);
        utteranceRef.current = null;

        const err = event?.error;
        if (err && err !== "interrupted" && err !== "canceled") {
          toast.error("Playback failed", {
            description:
              err === "synthesis-failed"
                ? "Your browser's built-in voice engine failed. Try Chrome/Edge or enable system voices."
                : "Please try again.",
          });
        }
      };

      window.speechSynthesis.speak(newUtterance);

      // If onstart doesn't fire quickly, stop showing spinner (some engines don't emit onstart reliably)
      window.setTimeout(() => {
        setIsLoading(false);
      }, 600);
    } catch (error) {
      console.error("Failed to start speech:", error);
      setIsPlaying(false);
      setIsLoading(false);
      toast.error("Audio not available");
    }
  }, [text, emotion, voices, isPlaying, isLoading, stopPlayback]);

  return (
    <Button
      size="sm"
      variant="ghost"
      className={`h-7 px-2.5 transition-all ${isPlaying ? 'text-primary' : ''}`}
      onClick={handleTTS}
      title={isPlaying ? "Stop" : "Listen"}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
