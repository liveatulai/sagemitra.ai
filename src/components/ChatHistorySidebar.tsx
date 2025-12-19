import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Settings, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SettingsModal from "./SettingsModal";
import ChatExportEnhanced from "./ChatExportEnhanced";

interface ChatSession {
  id: string;
  avatar_id: string;
  created_at: string;
  updated_at: string;
  avatar_name?: string;
  last_message?: string;
}

interface ChatHistorySidebarProps {
  currentSessionId?: string;
  currentAvatarId?: string;
  onClose?: () => void;
}

export default function ChatHistorySidebar({ currentSessionId, currentAvatarId, onClose }: ChatHistorySidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      const { data: sessionsData, error } = await supabase
        .from("chat_sessions")
        .select("id, avatar_id, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const enrichedSessions = await Promise.all(
        (sessionsData || []).map(async (session) => {
          let avatarName = "Unknown Avatar";
          
          const { data: defaultAvatar } = await supabase
            .from("avatars")
            .select("name")
            .eq("id", session.avatar_id)
            .maybeSingle();
          
          if (defaultAvatar) {
            avatarName = defaultAvatar.name;
          } else {
            const { data: userAvatar } = await supabase
              .from("user_avatars")
              .select("name")
              .eq("id", session.avatar_id)
              .maybeSingle();
            
            if (userAvatar) {
              avatarName = userAvatar.name;
            }
          }

          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("content")
            .eq("session_id", session.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...session,
            avatar_name: avatarName,
            last_message: lastMsg?.content || "No messages yet",
          };
        })
      );

      setSessions(enrichedSessions);
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      toast.success("Chat deleted");
      loadChatHistory();
      
      if (currentSessionId === sessionId) {
        navigate("/avatars");
      }
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      today: [] as ChatSession[],
      yesterday: [] as ChatSession[],
      older: [] as ChatSession[],
    };

    sessions.forEach((session) => {
      const sessionDate = new Date(session.updated_at);
      const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

      if (sessionDay.getTime() === today.getTime()) {
        groups.today.push(session);
      } else if (sessionDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  };

  const filteredSessions = sessions.filter(
    (session) =>
      session.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.avatar_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by avatar first, then by date within each avatar
  const sessionsByAvatar = filteredSessions.reduce((acc, session) => {
    const avatarKey = session.avatar_id;
    if (!acc[avatarKey]) {
      acc[avatarKey] = {
        avatarName: session.avatar_name || "Unknown Avatar",
        sessions: []
      };
    }
    acc[avatarKey].sessions.push(session);
    return acc;
  }, {} as Record<string, { avatarName: string; sessions: ChatSession[] }>);

  // If we have a current avatar, prioritize showing only that avatar's chats
  const shouldGroupByAvatar = !currentAvatarId;
  const groupedSessions = groupSessionsByDate(filteredSessions);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-card border-r">
        <div className="p-4 border-b space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const renderSessionGroup = (title: string, sessions: ChatSession[]) => {
    if (sessions.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2">{title}</h3>
        <div className="space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => {
                navigate(`/chat/${session.id}`);
                onClose?.();
              }}
              className={cn(
                "w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors group relative",
                currentSessionId === session.id && "bg-accent"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.avatar_name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {session.last_message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 shrink-0"
                  onClick={(e) => deleteSession(session.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Header with Export */}
      <div className="p-4 border-b space-y-3">
        {/* Export button at top if in active chat */}
        {currentSessionId && currentAvatarId && (
          <div className="sidebar-top-actions flex justify-end pb-2 border-b border-border/50">
            <ChatExportEnhanced
              sessionId={currentSessionId}
              messages={[]} // Will be populated by the component
              avatarName=""  // Will be fetched by the component
            />
          </div>
        )}
        
        <Button
          onClick={() => navigate("/avatars")}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? "No conversations match your search" : "No conversations yet"}
            </div>
          ) : shouldGroupByAvatar ? (
            // Group by avatar when viewing all chats
            Object.entries(sessionsByAvatar).map(([avatarId, data]) => (
              <div key={avatarId} className="mb-6">
                <h3 className="text-sm font-semibold px-3 mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {data.avatarName}
                </h3>
                <div className="space-y-1">
                  {data.sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        navigate(`/chat/${session.id}`);
                        onClose?.();
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors group relative",
                        currentSessionId === session.id && "bg-accent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.updated_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {session.last_message}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 shrink-0"
                          onClick={(e) => deleteSession(session.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Group by date when viewing single avatar
            <>
              {renderSessionGroup("Today", groupedSessions.today)}
              {renderSessionGroup("Yesterday", groupedSessions.yesterday)}
              {renderSessionGroup("Older", groupedSessions.older)}
            </>
          )}
        </div>
      </ScrollArea>

    </div>
  );
}
