import { useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AutoExpandTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  onHeightChange?: (height: number) => void;
}

export default function AutoExpandTextarea({
  value,
  onChange,
  placeholder = "Type your message...",
  disabled = false,
  className = "",
  minHeight = 48,
  maxHeight = 200,
  onHeightChange,
}: AutoExpandTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to recalculate
      textareaRef.current.style.height = `${minHeight}px`;
      
      // Calculate new height
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      textareaRef.current.style.height = `${newHeight}px`;
      
      if (onHeightChange) {
        onHeightChange(newHeight);
      }
    }
  }, [value, minHeight, maxHeight, onHeightChange]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "resize-none overflow-y-auto transition-all duration-200 ease-out",
        "scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
        className
      )}
      style={{
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
      }}
      onKeyDown={(e) => {
        // Submit on Enter (without Shift)
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const form = e.currentTarget.form;
          if (form) {
            form.requestSubmit();
          }
        }
      }}
    />
  );
}
