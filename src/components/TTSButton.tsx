import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sanitizeTextForTTS } from "@/lib/sanitizeEmoji";
import { supabase } from "@/integrations/supabase/client";

interface TTSButtonProps {
  text: string;
  emotion?: "calm" | "curious" | "joyful" | "reflective" | "loving";
  avatarType?: string;
}

export default function TTSButton({ text }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const handleTTS = useCallback(async () => {
    // Stop if already playing
    if (isPlaying || isLoading) {
      stopPlayback();
      return;
    }

    const sanitizedText = sanitizeTextForTTS(text).trim();
    if (!sanitizedText) {
      toast.info("Nothing to read");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: { text: sanitizedText },
      });

      if (error) {
        console.error("TTS error:", error);
        throw new Error(error.message || "Failed to generate audio");
      }

      if (!data?.audioContent) {
        throw new Error("No audio received");
      }

      // Play using data URI (browser handles base64 decoding natively)
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsPlaying(false);
        setIsLoading(false);
        audioRef.current = null;
        toast.error("Playback failed");
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsLoading(false);
      toast.error("Voice generation failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  }, [text, isPlaying, isLoading, stopPlayback]);

  return (
    <Button
      size="sm"
      variant="ghost"
      className={`h-7 px-2.5 transition-all ${isPlaying ? "text-primary" : ""}`}
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
