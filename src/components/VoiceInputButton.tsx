import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export default function VoiceInputButton({ 
  onTranscript, 
  disabled = false,
  className = ""
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setIsListening(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error("Microphone access denied", {
          description: "Please allow microphone access in your browser settings"
        });
      } else if (event.error === 'no-speech') {
        toast.info("No speech detected", {
          description: "Please try speaking again"
        });
      } else if (event.error !== 'aborted') {
        toast.error("Voice input error", {
          description: "Please try again"
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error("Voice input not supported", {
        description: "Please use a modern browser like Chrome"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Listening...", { duration: 2000 });
      } catch (error) {
        console.error('Microphone access error:', error);
        toast.error("Microphone access required", {
          description: "Please allow microphone access to use voice input"
        });
      }
    }
  }, [isListening]);

  if (!isSupported) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled
        className={className}
        title="Voice input not supported in this browser"
      >
        <MicOff className="h-5 w-5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={isListening ? "default" : "outline"}
      size="icon"
      onClick={toggleListening}
      disabled={disabled}
      className={`shrink-0 transition-all ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''} ${className}`}
      title={isListening ? "Stop listening" : "Start voice input"}
    >
      {isListening ? (
        <Mic className="h-5 w-5 text-white" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
