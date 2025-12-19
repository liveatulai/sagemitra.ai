import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  VolumeX,
  Loader2,
  Pause,
  Play,
  Square,
  Sparkles,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { sanitizeTextForTTS } from "@/lib/sanitizeEmoji";
import { supabase } from "@/integrations/supabase/client";

interface TTSButtonProps {
  text: string;
  avatarName?: string;
}

// ElevenLabs voice IDs mapped to avatar types
const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  // Sages - calm, wise voices
  "Buddha": "onwK4e9ZLuTAKqWW03F9", // Daniel - calm, wise
  "Ramana Maharshi": "onwK4e9ZLuTAKqWW03F9",
  "Guru Nanak": "onwK4e9ZLuTAKqWW03F9",
  "Nisargadatta Maharaj": "nPczCjzI2devNBz1zQrb", // Brian - mature
  "Swami Ram Tirtha": "onwK4e9ZLuTAKqWW03F9",
  "Saint Dnyaneshwar": "onwK4e9ZLuTAKqWW03F9",
  "Ramakrishna Paramhansa": "onwK4e9ZLuTAKqWW03F9",
  "J Krishnamurti": "nPczCjzI2devNBz1zQrb",
  
  // Scientists - thoughtful, articulate
  "Albert Einstein": "nPczCjzI2devNBz1zQrb", // Brian
  "Nikola Tesla": "JBFqnCBsd6RMkjVDRZzb", // George
  "Carl Jung": "nPczCjzI2devNBz1zQrb",
  
  // Creators - energetic, dynamic
  "Elon Musk": "IKne3meq5aSn9XLyUdCD", // Charlie - energetic
  "Steve Jobs": "TX3LPaxmHKxFdv7VOQHJ", // Liam
  "Mark Zuckerberg": "cjVigY5qzO86Huf0OWal", // Eric
};

// Default voice for unknown avatars
const DEFAULT_ELEVENLABS_VOICE = "onwK4e9ZLuTAKqWW03F9"; // Daniel

export default function TTSButton({ text, avatarName }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usePremiumVoice, setUsePremiumVoice] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const stopPlayback = useCallback(() => {
    // Stop browser TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    
    // Stop audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
  }, []);

  const pausePlayback = useCallback(() => {
    if (usePremiumVoice && audioRef.current) {
      audioRef.current.pause();
      setIsPaused(true);
    } else if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [usePremiumVoice]);

  const resumePlayback = useCallback(() => {
    if (usePremiumVoice && audioRef.current) {
      audioRef.current.play();
      setIsPaused(false);
    } else if (window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [usePremiumVoice]);

  const playWithBrowserTTS = useCallback((sanitizedText: string) => {
    if (!window.speechSynthesis) {
      toast.error("Browser voice not supported");
      return false;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(sanitizedText);
      utterance.rate = speed;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Try to get a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Daniel") ||
            v.name.includes("Karen"))
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utteranceRef.current = utterance;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error("Browser TTS error:", event);
        if (event.error !== "interrupted" && event.error !== "canceled") {
          setIsPlaying(false);
          setIsLoading(false);
          toast.error("Voice playback failed");
        }
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error("Browser TTS error:", error);
      return false;
    }
  }, [speed]);

  const playWithElevenLabs = useCallback(async (sanitizedText: string) => {
    try {
      const voiceId = avatarName
        ? ELEVENLABS_VOICE_MAP[avatarName] || DEFAULT_ELEVENLABS_VOICE
        : DEFAULT_ELEVENLABS_VOICE;

      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: { text: sanitizedText, voiceId },
      });

      if (error) {
        console.error("ElevenLabs TTS error:", error);
        throw new Error(error.message || "Failed to generate audio");
      }

      if (!data?.audioContent) {
        throw new Error("No audio received");
      }

      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      audio.playbackRate = speed;
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsPlaying(false);
        setIsLoading(false);
        audioRef.current = null;
        // Fallback to browser TTS
        toast.info("Falling back to browser voice");
        playWithBrowserTTS(sanitizedText);
      };

      await audio.play();
      return true;
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
      // Fallback to browser TTS
      toast.info("Using browser voice (ElevenLabs unavailable)");
      return playWithBrowserTTS(sanitizedText);
    }
  }, [avatarName, speed, playWithBrowserTTS]);

  const handleTTS = useCallback(async () => {
    // Handle pause/resume if already playing
    if (isPlaying && !isPaused) {
      pausePlayback();
      return;
    }
    
    if (isPaused) {
      resumePlayback();
      return;
    }

    // Stop any existing playback
    if (isLoading) {
      stopPlayback();
      return;
    }

    const sanitizedText = sanitizeTextForTTS(text).trim();
    if (!sanitizedText) {
      toast.info("Nothing to read");
      return;
    }

    // Limit text length
    const maxLength = 2500;
    const textToSpeak = sanitizedText.length > maxLength 
      ? sanitizedText.slice(0, maxLength) 
      : sanitizedText;

    if (sanitizedText.length > maxLength) {
      toast.info("Text truncated for voice playback");
    }

    setIsLoading(true);

    if (usePremiumVoice) {
      await playWithElevenLabs(textToSpeak);
    } else {
      const success = playWithBrowserTTS(textToSpeak);
      if (!success) {
        setIsLoading(false);
      }
    }
  }, [
    text,
    isPlaying,
    isPaused,
    isLoading,
    usePremiumVoice,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    playWithElevenLabs,
    playWithBrowserTTS,
  ]);

  const getButtonIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    }
    if (isPlaying && !isPaused) {
      return <Pause className="h-3.5 w-3.5" />;
    }
    if (isPaused) {
      return <Play className="h-3.5 w-3.5" />;
    }
    return <Volume2 className="h-3.5 w-3.5" />;
  };

  const getButtonTitle = () => {
    if (isLoading) return "Loading...";
    if (isPlaying && !isPaused) return "Pause";
    if (isPaused) return "Resume";
    return "Listen";
  };

  return (
    <div className="flex items-center gap-0.5">
      <Popover open={showControls} onOpenChange={setShowControls}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={`h-7 px-2.5 transition-all ${
              isPlaying ? "text-primary" : ""
            } ${usePremiumVoice ? "ring-1 ring-primary/30" : ""}`}
            onClick={(e) => {
              // If holding shift or long press, show settings
              if (e.shiftKey) {
                setShowControls(true);
              } else {
                handleTTS();
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowControls(true);
            }}
            title={getButtonTitle()}
          >
            {getButtonIcon()}
            {usePremiumVoice && (
              <Sparkles className="h-2.5 w-2.5 ml-0.5 text-primary" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="premium-voice" className="text-sm font-medium">
                Premium Voice
              </Label>
              <Switch
                id="premium-voice"
                checked={usePremiumVoice}
                onCheckedChange={setUsePremiumVoice}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {usePremiumVoice
                ? "Using ElevenLabs (uses credits)"
                : "Using browser voice (free)"}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Speed: {speed.toFixed(1)}x</Label>
              </div>
              <Slider
                value={[speed]}
                onValueChange={([v]) => setSpeed(v)}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  handleTTS();
                  setShowControls(false);
                }}
                disabled={isLoading}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Play
                  </>
                )}
              </Button>
              {(isPlaying || isPaused) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    stopPlayback();
                    setShowControls(false);
                  }}
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {(isPlaying || isPaused) && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={stopPlayback}
          title="Stop"
        >
          <Square className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
