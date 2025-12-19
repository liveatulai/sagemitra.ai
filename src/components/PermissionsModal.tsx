import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain, Sparkles } from "lucide-react";

interface PermissionsModalProps {
  open: boolean;
  onComplete: (preferences: { personalizedMemory: boolean; presenceGestures: boolean }) => void;
}

export default function PermissionsModal({ open, onComplete }: PermissionsModalProps) {
  const [personalizedMemory, setPersonalizedMemory] = useState(true);
  const [presenceGestures, setPresenceGestures] = useState(true);

  const handleContinue = () => {
    onComplete({ personalizedMemory, presenceGestures });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ✨ Customize Your Experience
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to interact with your AI companions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start justify-between space-x-4">
            <div className="flex items-start space-x-3 flex-1">
              <Brain className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="memory" className="text-base font-medium">
                  Personalized Memory
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow avatars to remember context from your past conversations for continuity
                </p>
              </div>
            </div>
            <Switch
              id="memory"
              checked={personalizedMemory}
              onCheckedChange={setPersonalizedMemory}
            />
          </div>

          <div className="flex items-start justify-between space-x-4">
            <div className="flex items-start space-x-3 flex-1">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="gestures" className="text-base font-medium">
                  Avatar Presence Gestures
                </Label>
                <p className="text-sm text-muted-foreground">
                  See subtle gestures like *gazes with compassion* to enhance emotional connection
                </p>
              </div>
            </div>
            <Switch
              id="gestures"
              checked={presenceGestures}
              onCheckedChange={setPresenceGestures}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleContinue} className="w-full">
            Continue to SageMitra
          </Button>
        </DialogFooter>

        <p className="text-xs text-center text-muted-foreground mt-2">
          You can change these preferences anytime in Settings
        </p>
      </DialogContent>
    </Dialog>
  );
}
