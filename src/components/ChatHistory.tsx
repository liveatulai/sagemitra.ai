import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { MessageSquare, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface ChatSession {
  id: string;
  avatar_id: string;
  created_at: string;
  updated_at: string;
  avatar_name?: string;
  last_message?: string;
}

export default function ChatHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
        .select(`
          id,
          avatar_id,
          created_at,
          updated_at
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get avatar names and last messages for each session
      const enrichedSessions = await Promise.all(
        (sessionsData || []).map(async (session) => {
          // Try to get avatar name
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

          // Get last message
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

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      toast.success("Chat deleted");
      loadChatHistory();
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  if (!user) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Sign in to view your chat history</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-6 text-center animate-fade-in">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No chat history yet</p>
        <p className="text-sm text-muted-foreground mt-1">Start chatting with an avatar!</p>
      </Card>
    );
  }

  // Filter sessions by search query
  const filteredSessions = sessions.filter(session => 
    session.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.avatar_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 animate-slide-in-right">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your past messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No messages match your search</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((session) => (
            <Card
              key={session.id}
              className="p-3 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer group active:scale-[0.99]"
              onClick={() => navigate(`/chat/${session.id}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground truncate">
                    {session.last_message}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {new Date(session.updated_at).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
