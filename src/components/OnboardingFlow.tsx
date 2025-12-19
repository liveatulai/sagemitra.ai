import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sparkles, Brain, Telescope, ChevronRight, Check, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Avatar {
  id: string;
  name: string;
  title: string;
  image_url: string;
  category: string;
}

export default function OnboardingFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedVibe, setSelectedVibe] = useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);

  useEffect(() => {
    checkOnboarding();
  }, [user]);

  const checkOnboarding = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (!profile?.onboarding_completed) {
      setOpen(true);
      loadAvatars();
    }
  };

  const loadAvatars = async () => {
    const { data } = await supabase
      .from("avatars")
      .select("id, name, title, image_url, category")
      .eq("is_active", true)
      .limit(6);

    if (data) setAvatars(data);
  };

  const vibes = [
    {
      id: "spiritual",
      icon: Sparkles,
      title: "Spiritual",
      description: "Journey inward with mystics and sages",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      id: "philosophical",
      icon: Brain,
      title: "Philosophical",
      description: "Explore deep thoughts with great thinkers",
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      id: "scientific",
      icon: Telescope,
      title: "Scientific",
      description: "Discover truth with visionary minds",
      gradient: "from-teal-500 to-cyan-500",
    },
  ];

  const handleVibeSelect = (vibeId: string) => {
    setSelectedVibe(vibeId);
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  const handleComplete = async () => {
    if (!user) return;

    try {
      // Use upsert to create profile if it doesn't exist
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          onboarding_completed: true,
          preferred_vibe: selectedVibe,
          first_avatar_id: selectedAvatar,
        }, { onConflict: 'id' });

      // Create initial chat session with selected avatar
      if (selectedAvatar) {
        const { data: session } = await supabase
          .from("chat_sessions")
          .insert({
            user_id: user.id,
            avatar_id: selectedAvatar,
          })
          .select()
          .single();

        if (session) {
          navigate(`/chat/${session.id}`);
        }
      }

      toast.success("Welcome to SageMitra! Your journey begins.");
      setOpen(false);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Failed to complete onboarding");
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedVibe) {
      toast.error("Please select a vibe");
      return;
    }
    if (step === 2 && !selectedAvatar) {
      toast.error("Please select an avatar");
      return;
    }
    if (step < 3) setStep(step + 1);
    else handleComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6 py-4">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-all ${
                  s === step
                    ? "bg-primary w-20"
                    : s < step
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Choose Vibe */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Welcome to SageMitra
                </h2>
                <p className="text-muted-foreground">
                  Choose your path of wisdom
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {vibes.map((vibe) => {
                  const Icon = vibe.icon;
                  return (
                    <Card
                      key={vibe.id}
                      className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                        selectedVibe === vibe.id
                          ? "ring-2 ring-primary shadow-lg"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => handleVibeSelect(vibe.id)}
                    >
                      <div className="space-y-3">
                        <div
                          className={`w-12 h-12 rounded-full bg-gradient-to-br ${vibe.gradient} flex items-center justify-center`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-semibold">{vibe.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {vibe.description}
                        </p>
                        {selectedVibe === vibe.id && (
                          <Check className="h-5 w-5 text-primary ml-auto" />
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Select Avatar */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                  Choose Your First Guide
                </h2>
                <p className="text-muted-foreground">
                  Select an avatar to begin your journey
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {avatars.map((avatar) => (
                  <Card
                    key={avatar.id}
                    className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                      selectedAvatar === avatar.id
                        ? "ring-2 ring-primary shadow-lg"
                        : "hover:shadow-md"
                    }`}
                    onClick={() => handleAvatarSelect(avatar.id)}
                  >
                    <div className="space-y-3">
                      <div className="relative w-20 h-20 mx-auto">
                        <img
                          src={avatar.image_url || "/placeholder.svg"}
                          alt={avatar.name}
                          className="w-full h-full rounded-full object-cover border-2 border-primary/20"
                        />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold">{avatar.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {avatar.title}
                        </p>
                      </div>
                      {selectedAvatar === avatar.id && (
                        <Check className="h-5 w-5 text-primary mx-auto" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Tour */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">You're All Set!</h2>
                <p className="text-muted-foreground">
                  Here's a quick tour of your sanctuary
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex gap-4 items-start p-4 rounded-lg bg-accent/50">
                  <MessageSquare className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold">Chat with Wisdom</h3>
                    <p className="text-sm text-muted-foreground">
                      Have deep conversations with your chosen avatars
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-lg bg-accent/50">
                  <Sparkles className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold">Quick Replies</h3>
                    <p className="text-sm text-muted-foreground">
                      Use suggested responses to continue naturally
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-lg bg-accent/50">
                  <Brain className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold">Avatar Memory</h3>
                    <p className="text-sm text-muted-foreground">
                      Avatars remember your past conversations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={nextStep}
              size="lg"
              className="gap-2"
            >
              {step === 3 ? "Begin Journey" : "Continue"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
