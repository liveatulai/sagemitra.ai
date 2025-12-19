import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Settings as SettingsIcon, Info, LogOut, Sparkles, Brain } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [credits, setCredits] = useState<number>(0);
  const [presenceEnabled, setPresenceEnabled] = useState(
    localStorage.getItem("presence_enabled") !== "false"
  );
  const [memoryEnabled, setMemoryEnabled] = useState(
    localStorage.getItem("memory_enabled") !== "false"
  );
  const [ambientSoundEnabled, setAmbientSoundEnabled] = useState(
    localStorage.getItem("ambient_sound_enabled") !== "false"
  );
  const [emotionAnimationsEnabled, setEmotionAnimationsEnabled] = useState(
    localStorage.getItem("emotion_animations_enabled") !== "false"
  );
  const [adaptiveVoiceEnabled, setAdaptiveVoiceEnabled] = useState(
    localStorage.getItem("adaptive_voice_enabled") !== "false"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      loadUserData();
    }
  }, [open, user]);

  const loadUserData = async () => {
    try {
      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      // Load credits
      const { data: creditData } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user?.id)
        .single();

      setUserProfile(profile);
      setCredits(creditData?.balance || 0);
      
      // Load preferences from localStorage
      const savedPresence = localStorage.getItem("presenceEnabled");
      const savedMemory = localStorage.getItem("memoryEnabled");
      
      if (savedPresence !== null) setPresenceEnabled(savedPresence === "true");
      if (savedMemory !== null) setMemoryEnabled(savedMemory === "true");
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresenceToggle = (checked: boolean) => {
    setPresenceEnabled(checked);
    localStorage.setItem("presence_enabled", String(checked));
  };

  const handleMemoryToggle = (checked: boolean) => {
    setMemoryEnabled(checked);
    localStorage.setItem("memory_enabled", String(checked));
  };

  const handleAmbientSoundToggle = (checked: boolean) => {
    setAmbientSoundEnabled(checked);
    localStorage.setItem("ambient_sound_enabled", String(checked));
  };

  const handleEmotionAnimationsToggle = (checked: boolean) => {
    setEmotionAnimationsEnabled(checked);
    localStorage.setItem("emotion_animations_enabled", String(checked));
  };

  const handleAdaptiveVoiceToggle = (checked: boolean) => {
    setAdaptiveVoiceEnabled(checked);
    localStorage.setItem("adaptive_voice_enabled", String(checked));
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <SettingsIcon className="h-6 w-6" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Info className="h-4 w-4" />
              App Info
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4 pt-4">
            {loading ? (
              <div className="space-y-3">
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
              </div>
            ) : (
              <>
                <div className="space-y-2 p-4 bg-card border rounded-lg">
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <p className="text-base font-medium">{userProfile?.full_name || "Not set"}</p>
                </div>

                <div className="space-y-2 p-4 bg-card border rounded-lg">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="text-base font-medium">{user?.email}</p>
                </div>

                <div className="space-y-2 p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Available Credits
                  </Label>
                  <p className="text-3xl font-bold text-primary">{credits}</p>
                  <p className="text-xs text-muted-foreground">
                    Each message costs 1 credit
                  </p>
                </div>

                <Separator className="my-4" />

                <Button 
                  variant="destructive" 
                  onClick={handleSignOut}
                  className="w-full gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            )}
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4 pt-4">
            <div className="space-y-4 p-4 bg-card border rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="presence" className="text-base font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Avatar Presence Gestures
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable subtle gestures and actions from avatars during conversations
                  </p>
                </div>
                <Switch
                  id="presence"
                  checked={presenceEnabled}
                  onCheckedChange={handlePresenceToggle}
                />
              </div>

              <Separator />

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="memory" className="text-base font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Personalized Memory
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow avatars to remember context from your previous conversations
                  </p>
                </div>
                <Switch
                  id="memory"
                  checked={memoryEnabled}
                  onCheckedChange={handleMemoryToggle}
                />
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-lg border bg-card/50">
              <h3 className="font-medium mb-3 text-primary">Avatar Presence & Sound</h3>
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Ambient Sound</p>
                  <p className="text-xs text-muted-foreground">
                    Subtle background atmosphere during voice playback
                  </p>
                </div>
                <Switch checked={ambientSoundEnabled} onCheckedChange={handleAmbientSoundToggle} />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Emotion Animations</p>
                  <p className="text-xs text-muted-foreground">
                    Visual mood indicators around avatar
                  </p>
                </div>
                <Switch checked={emotionAnimationsEnabled} onCheckedChange={handleEmotionAnimationsToggle} />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Adaptive Voice Tone</p>
                  <p className="text-xs text-muted-foreground">
                    Voice adjusts based on emotional context
                  </p>
                </div>
                <Switch checked={adaptiveVoiceEnabled} onCheckedChange={handleAdaptiveVoiceToggle} />
              </div>
            </div>

            <div className="p-4 bg-muted/30 border rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> Presence gestures make conversations feel more alive and immersive, 
                while personalized memory helps avatars provide more contextual guidance.
              </p>
            </div>
          </TabsContent>

          {/* App Info Tab */}
          <TabsContent value="info" className="space-y-4 pt-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  navigate("/terms");
                  onOpenChange(false);
                }}
              >
                Terms of Service
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  navigate("/privacy");
                  onOpenChange(false);
                }}
              >
                Privacy Policy
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  navigate("/guidelines");
                  onOpenChange(false);
                }}
              >
                AI Interaction Guidelines
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg space-y-2">
              <h3 className="font-semibold text-lg">About SageMitra</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                SageMitra is an AI companion platform that connects you with archetypal guides 
                for reflection, wisdom, and personal growth. Each avatar represents a unique 
                perspective and personality to enrich your journey.
              </p>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Version 2.0 • Made with ✨ for seekers and thinkers
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
