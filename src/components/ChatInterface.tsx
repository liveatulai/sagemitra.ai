import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu, Send, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ChatHistorySidebar from "./ChatHistorySidebar";
import ChatMessage from "./ChatMessage";
import ChatExport from "./ChatExport";
import ChatExportEnhanced from "./ChatExportEnhanced";
import PresenceLayer from "./PresenceLayer";
import AutoExpandTextarea from "./AutoExpandTextarea";
import VoiceInputButton from "./VoiceInputButton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import einsteinImg from "@/assets/avatars/einstein.jpg";
import ramanaImg from "@/assets/avatars/ramana.jpg";
import buddhaImg from "@/assets/avatars/buddha.jpg";
import nanakImg from "@/assets/avatars/nanak.jpg";
import nisargadattaImg from "@/assets/avatars/nisargadatta.jpg";
import ramtirthaImg from "@/assets/avatars/ramtirtha.jpg";
import dnyaneshwarImg from "@/assets/avatars/dnyaneshwar.jpg";
import ramakrishnaImg from "@/assets/avatars/ramakrishna.jpg";
import teslaImg from "@/assets/avatars/tesla.jpg";
import jungImg from "@/assets/avatars/jung.jpg";
import muskImg from "@/assets/avatars/musk.jpg";
import jobsImg from "@/assets/avatars/jobs.jpg";
import zuckerbergImg from "@/assets/avatars/zuckerberg.jpg";
import krishnamurtiImg from "@/assets/avatars/krishnamurti.jpg";

const avatarImages: Record<string, string> = {
  "Albert Einstein": einsteinImg,
  "Ramana Maharshi": ramanaImg,
  "Buddha": buddhaImg,
  "Guru Nanak": nanakImg,
  "Nisargadatta Maharaj": nisargadattaImg,
  "Swami Ram Tirtha": ramtirthaImg,
  "Saint Dnyaneshwar": dnyaneshwarImg,
  "Ramakrishna Paramhansa": ramakrishnaImg,
  "Nikola Tesla": teslaImg,
  "Carl Jung": jungImg,
  "Elon Musk": muskImg,
  "Steve Jobs": jobsImg,
  "Mark Zuckerberg": zuckerbergImg,
  "J Krishnamurti": krishnamurtiImg,
};

interface Reaction {
  emoji: string;
  user_id: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "gesture";
  content: string;
  created_at: string;
  reactions?: Reaction[];
  reply_to?: string;
  reply_preview?: string;
}

interface Avatar {
  id: string;
  name: string;
  title: string;
  personality_prompt: string;
  image_url?: string;
}

export default function ChatInterface() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [regenerateCounts, setRegenerateCounts] = useState<Record<string, number>>({});
  const [presenceEnabled, setPresenceEnabled] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string; preview: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});

  const welcomeSentRef = useRef(false);

  useEffect(() => {
    welcomeSentRef.current = false; // Reset when session changes
    loadSession();
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [sessionId]);

  useEffect(() => {
    if (avatar && sessionId && !welcomeSentRef.current) {
      welcomeSentRef.current = true;
      sendWelcomeMessage();
    }
  }, [avatar, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      // First get the session to find the avatar_id
      const { data: session, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        toast.error("Session not found");
        navigate("/avatars");
        return;
      }

      console.log("Session loaded:", session);

      // Try to fetch from default avatars first
      const { data: defaultAvatar, error: defaultError } = await supabase
        .from("avatars")
        .select("id, name, title, personality_prompt, image_url")
        .eq("id", session.avatar_id)
        .maybeSingle();

      console.log("Default avatar check:", defaultAvatar, defaultError);

      let avatarData: (Avatar & { image_url?: string }) | null = null;

      if (defaultAvatar) {
        avatarData = defaultAvatar as Avatar & { image_url?: string };
      } else {
        // Try user_avatars if not found in default avatars
        const { data: userAvatar, error: userError } = await supabase
          .from("user_avatars")
          .select("id, name, title, personality_prompt, image_url")
          .eq("id", session.avatar_id)
          .maybeSingle();

        console.log("User avatar check:", userAvatar, userError);

        if (userAvatar) {
          avatarData = userAvatar as Avatar & { image_url?: string };
        }
      }

      if (!avatarData) {
        console.error("Avatar not found for ID:", session.avatar_id);
        toast.error("Avatar not found");
        navigate("/avatars");
        return;
      }

      console.log("Avatar loaded:", avatarData);
      setAvatar(avatarData);

      await loadMessages(sessionId);
      setLoading(false);
    } catch (error) {
      console.error("Unexpected error loading session:", error);
      toast.error("Failed to load chat session");
      navigate("/avatars");
    }
  };

  const loadMessages = async (sid: string) => {
    const { data: msgs, error: msgsError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });

    console.log("Messages loaded:", msgs, msgsError);

    if (msgs) {
      setMessages(
        msgs.map((m) => ({
          ...(m as any),
          role: (m as any).role as "user" | "assistant" | "gesture",
          reactions: ((m as any).reactions as any) || [],
        })) as Message[]
      );
    }
  };

  const subscribeToMessages = () => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("New message received via realtime:", payload.new);
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                ...newMsg,
                role: newMsg.role as "user" | "assistant" | "gesture",
                reactions: (newMsg.reactions as any) || [],
              },
            ];
          });
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendWelcomeMessage = async () => {
    if (!sessionId || !avatar) return;
    
    // Check if there are already messages
    const { data: existingMessages } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("session_id", sessionId)
      .limit(1);

    if (existingMessages && existingMessages.length > 0) return;

    console.log("Sending welcome message for avatar:", avatar.name);

    try {
      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId,
            message: `[WELCOME] Generate a brief, warm welcoming message (max 50 words) to greet someone starting a new conversation with you.`,
            avatarId: avatar.id,
            isWelcome: true, // Flag to indicate this is a welcome message
          })
        }
      );
      
      const data = await response.json();
      
      if (response.ok && data?.success) {
        console.log("Welcome message sent successfully");
        await loadMessages(sessionId);
      } else {
        console.error("Welcome message failed:", data);
      }
    } catch (error) {
      console.error("Failed to send welcome message:", error);
    }
  };

  const sendMessage = async (content: string, autoRegenerate: boolean = false) => {
    if (!content.trim() || !sessionId || !avatar) return;

    setSending(true);
    if (!autoRegenerate) {
      setInput("");
    }

    try {
      // Save user message with reply metadata
      const messageData: any = { 
        session_id: sessionId, 
        role: "user", 
        content 
      };
      
      if (replyTo) {
        messageData.reply_to = replyTo.id;
        messageData.reply_preview = replyTo.preview;
      }

      const { error: insertError } = await supabase
        .from("chat_messages")
        .insert(messageData);

      // Clear reply state
      setReplyTo(null);

      if (insertError) {
        console.error("Error saving user message:", insertError);
        throw new Error("Failed to save your message");
      }

      // Ensure UI shows the user message even if realtime is delayed
      await loadMessages(sessionId);

      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId,
            message: content,
            avatarId: avatar.id,
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Chat function error:", { status: response.status, data });
        
        const errorMessage = data?.error || "Failed to get response from AI";
        const errorCode = data?.code;
        
        // Handle specific error codes
        if (errorCode === 'E005' || response.status === 402) {
          toast.error("Insufficient credits for AI chat. Please add credits to your workspace in Settings → Workspace → Usage.");
          setSending(false);
          return;
        } else if (errorCode === 'E004' || response.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a few moments.");
          setSending(false);
          return;
        } else {
          throw new Error(errorMessage);
        }
      }

      if (!data?.success) {
        console.error("Chat function returned error:", data);
        throw new Error(data?.error || "Failed to get response from AI");
      }

      // Update session timestamp
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);

      // Ensure assistant message is visible even if realtime is delayed
      await loadMessages(sessionId);
    } catch (error: any) {
      console.error("Send message error:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const { error } = await supabase
      .from("chat_messages")
      .update({ content: newContent })
      .eq("id", messageId);

    if (error) {
      toast.error("Failed to edit message");
      return;
    }

    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, content: newContent } : msg))
    );
    
    // Auto-regenerate assistant response if there is one after the edited message
    if (msgIndex < messages.length - 1 && messages[msgIndex + 1].role === "assistant") {
      const assistantMsgId = messages[msgIndex + 1].id;
      await supabase.from("chat_messages").delete().eq("id", assistantMsgId);
      setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
      
      // Trigger regeneration
      sendMessage(newContent, true);
    } else {
      toast.success("Message updated");
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!sessionId || !avatar) return;

    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1 || msgIndex === 0) return;

    const userMessage = messages[msgIndex - 1];
    if (userMessage.role !== "user") return;

    setSending(true);
    try {
      // Increment regenerate count
      const currentCount = regenerateCounts[userMessage.id] || 1;
      setRegenerateCounts(prev => ({ ...prev, [userMessage.id]: currentCount + 1 }));

      // Delete the assistant message
      await supabase.from("chat_messages").delete().eq("id", messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      // Regenerate by calling the AI again using direct fetch
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId,
            message: userMessage.content,
            avatarId: avatar.id,
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorCode = data?.code;
        
        if (errorCode === 'E005' || response.status === 402) {
          toast.error("Insufficient credits for AI chat. Please add credits to your workspace.");
        } else if (errorCode === 'E004' || response.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a few moments.");
        } else {
          throw new Error(data?.error || "Failed to regenerate");
        }
        return;
      }

      if (!data?.success) throw new Error(data?.error || "Failed to regenerate");

      toast.success(`Response regenerated (${currentCount + 1}/${currentCount + 1})`);
    } catch (error: any) {
      console.error("Regenerate error:", error);
      toast.error("Failed to regenerate response");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReply = (messageId: string, preview: string) => {
    setReplyTo({ id: messageId, preview });
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("animate-pulse");
      setTimeout(() => element.classList.remove("animate-pulse"), 2000);
    }
  };

  const getDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    const currentDate = new Date(currentMsg.created_at);
    const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
    
    const isSameDay = prevDate && 
      currentDate.getDate() === prevDate.getDate() &&
      currentDate.getMonth() === prevDate.getMonth() &&
      currentDate.getFullYear() === prevDate.getFullYear();
    
    if (isSameDay) return null;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = currentDate.toDateString() === today.toDateString();
    const isYesterday = currentDate.toDateString() === yesterday.toDateString();
    
    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return currentDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="p-4 border-b">
          <Skeleton className="h-12 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-3/4 ml-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      {/* ChatGPT-style Sidebar */}
      <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
        <SheetContent side="left" className="p-0 w-80">
          <ChatHistorySidebar 
            currentSessionId={sessionId} 
            currentAvatarId={avatar?.id}
            onClose={() => setShowSidebar(false)} 
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 w-full h-full">
        {/* Header - Enhanced with responsive name display */}
        <div className="chat-header sticky top-0 z-10 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-b shadow-md">
          <div className="chat-header-left flex items-center gap-3 p-3 md:p-4 max-w-5xl mx-auto flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/avatars")}
              className="shrink-0 h-10 w-10"
              title="Back to Avatars"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(true)}
              className="shrink-0 h-10 w-10 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {avatar && (
              <>
                <div className="chat-header-avatar h-10 w-10 md:h-12 md:w-12 rounded-full shrink-0 overflow-hidden border-2 border-primary/30 shadow-lg">
                  <img
                    src={avatar.image_url ? `${avatar.image_url}?t=${Date.now()}` : avatarImages[avatar.name]}
                    alt={avatar.name}
                    className="avatar-image"
                    loading="lazy"
                  />
                </div>
                <div className="chat-header-info flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="chat-avatar-name font-bold text-base md:text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent drop-shadow-sm">
                      {avatar.name}
                    </h2>
                    {sending && (
                      <div className="presence-dot" title="Thinking..." />
                    )}
                  </div>
                  <span className="chat-avatar-title text-xs text-muted-foreground hidden md:block">{avatar.title}</span>
                </div>
                {/* Export Button */}
                <ChatExport 
                  messages={messages.map(m => ({ 
                    role: m.role as "user" | "assistant", 
                    content: m.content, 
                    created_at: m.created_at 
                  }))} 
                  avatarName={avatar.name} 
                />
                {/* Divine Typing Aura */}
                {sending && <div className="typing-aura" />}
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative"
          style={{ 
            height: 'calc(100vh - 180px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)'
          }}
        >
          {messages.map((message, idx) => {
            const prevMessage = idx > 0 ? messages[idx - 1] : null;
            const regenerateCount = prevMessage?.role === "user" 
              ? (regenerateCounts[prevMessage.id] || 1) 
              : 1;
            
            const dateSeparator = getDateSeparator(message, prevMessage);
            
            // Handle gesture messages inline
            if (message.role === "gesture") {
              return (
                <div key={message.id}>
                  {dateSeparator && (
                    <div className="flex items-center justify-center my-6">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                      <span className="px-4 text-xs font-medium text-muted-foreground bg-gradient-to-r from-primary/30 to-accent/30 bg-clip-text text-transparent">
                        {dateSeparator}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                  )}
                  <div className="flex justify-center my-4">
                    <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-fade-in">
                      <p className="text-sm italic text-muted-foreground">{message.content}</p>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={message.id} ref={el => { if (el) messageRefs.current[message.id] = el; }}>
                {dateSeparator && (
                  <div className="flex items-center justify-center my-6 animate-fade-in">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <span className="px-4 text-xs font-medium text-muted-foreground bg-gradient-to-r from-primary/30 to-accent/30 bg-clip-text text-transparent">
                      {dateSeparator}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                )}
                <ChatMessage
                  message={{
                    id: message.id,
                    role: message.role as "user" | "assistant",
                    content: message.content,
                    created_at: message.created_at,
                    reactions: message.reactions,
                    reply_to: message.reply_to,
                    reply_preview: message.reply_preview,
                  }}
                  avatarImage={
                    avatar?.image_url
                      ? `${avatar.image_url}?t=${Date.now()}`
                      : avatarImages[avatar?.name || ""]
                  }
                  avatarName={avatar?.name}
                  sessionId={sessionId}
                  onEdit={handleEditMessage}
                  onRegenerate={handleRegenerate}
                  onReply={handleReply}
                  onScrollToMessage={scrollToMessage}
                  onSelectSuggestion={(suggestion) => {
                    setInput(suggestion);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                  }}
                  regenerateCount={regenerateCount}
                />
              </div>
            );
          })}
          {sending && (
            <div className="flex gap-3">
              {avatar && (
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full shrink-0 overflow-hidden mt-1 shadow-md">
                  <img
                    src={avatar.image_url ? `${avatar.image_url}?t=${Date.now()}` : avatarImages[avatar.name]}
                    alt={avatar.name}
                    className="avatar-image"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="bg-card border shadow-md rounded-2xl px-5 py-4">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />

          {/* Presence Layer */}
          {avatar && (
            <PresenceLayer 
              avatarName={avatar.name} 
              isTyping={sending} 
              enabled={presenceEnabled}
              onGestureGenerated={(gesture) => {
                // Add gesture as inline message
                setMessages(prev => [...prev, {
                  id: `gesture-${Date.now()}`,
                  role: "gesture" as const,
                  content: gesture,
                  created_at: new Date().toISOString()
                }]);
              }}
            />
          )}
        </div>

        {/* Input */}
        <div 
          className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-lg border-t shadow-lg"
          style={{ 
            paddingBottom: 'env(safe-area-inset-bottom, 16px)'
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-4xl mx-auto p-4">
            {/* Reply Preview */}
            {replyTo && (
              <div className="flex items-start gap-2 px-3 py-2 bg-accent/20 rounded-lg border border-accent/30 animate-fade-in">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Replying to:</p>
                  <p className="text-sm line-clamp-2">{replyTo.preview}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setReplyTo(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <VoiceInputButton
                onTranscript={(text) => {
                  setInput(prev => prev ? `${prev} ${text}` : text);
                }}
                disabled={sending}
                className="shrink-0 h-12 w-12"
              />
              <AutoExpandTextarea
                value={input}
                onChange={setInput}
                placeholder="Type your message..."
                disabled={sending}
                className="flex-1 rounded-2xl text-base px-6 py-3"
                minHeight={48}
                maxHeight={200}
              />
              <Button
                type="submit"
                disabled={!input.trim() || sending}
                size="icon"
                className="shrink-0 rounded-full h-12 w-12"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
