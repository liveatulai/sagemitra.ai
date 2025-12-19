import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const REACTIONS = ["❤️", "😂", "🙏", "✨", "👍"];

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

export default function ReactionPicker({ onReact, trigger, children }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);

  const handleReaction = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2 bg-card/95 backdrop-blur-lg border shadow-lg animate-scale-in" 
        sideOffset={5}
      >
        <div className="flex gap-1">
          {REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 hover:scale-125 transition-transform"
              onClick={() => handleReaction(emoji)}
            >
              <span className="text-lg">{emoji}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
