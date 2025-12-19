import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Check, X, MessageSquare, Copy, ThumbsUp, ThumbsDown, RotateCw, Reply, Smile, X as CloseIcon } from "lucide-react";
import { toast } from "sonner";
import ShareButton from "./ShareButton";
import TTSButton from "./TTSButton";
import MarkdownRenderer from "./MarkdownRenderer";
import FollowUpSuggestions from "./FollowUpSuggestions";
import ReactionPicker from "./ReactionPicker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Reaction {
  emoji: string;
  user_id: string;
  created_at: string;
}

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
    reactions?: Reaction[];
    reply_to?: string;
    reply_preview?: string;
  };
  avatarImage?: string;
  avatarName?: string;
  sessionId?: string;
  onEdit?: (id: string, newContent: string) => void;
  onFollowUp?: (content: string) => void;
  onRegenerate?: (id: string) => void;
  onSelectSuggestion?: (suggestion: string) => void;
  onReply?: (messageId: string, content: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  regenerateCount?: number;
}

export default function ChatMessage({ 
  message, 
  avatarImage, 
  avatarName, 
  sessionId,
  onEdit, 
  onFollowUp, 
  onRegenerate,
  onSelectSuggestion,
  onReply,
  onScrollToMessage,
  regenerateCount = 1
}: ChatMessageProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>(message.reactions || []);

  const handleSave = () => {
    if (onEdit && editedContent.trim()) {
      onEdit(message.id, editedContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Message copied to clipboard");
  };

  const handleFeedback = (type: "like" | "dislike") => {
    setFeedback(type);
    toast.success(type === "like" ? "Thanks for your feedback!" : "Feedback noted");
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    
    try {
      const existingReaction = reactions.find(r => r.user_id === user.id && r.emoji === emoji);
      
      let newReactions: Reaction[];
      if (existingReaction) {
        // Remove reaction
        newReactions = reactions.filter(r => !(r.user_id === user.id && r.emoji === emoji));
      } else {
        // Add reaction
        newReactions = [...reactions, { emoji, user_id: user.id, created_at: new Date().toISOString() }];
      }
      
      const { error } = await supabase
        .from("chat_messages")
        .update({ reactions: newReactions as any })
        .eq("id", message.id);
      
      if (error) throw error;
      
      setReactions(newReactions);
    } catch (error) {
      console.error("Failed to update reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  const handleReplyClick = () => {
    if (onReply) {
      const preview = message.content.substring(0, 100) + (message.content.length > 100 ? "..." : "");
      onReply(message.id, preview);
    }
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, users: [] };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user_id);
    return acc;
  }, {} as Record<string, { count: number; users: string[] }>);

  const hasUserReacted = (emoji: string) => {
    return user && groupedReactions[emoji]?.users.includes(user.id);
  };

  return (
    <div className="space-y-2">
      <div className={`flex gap-3 group ${message.role === "user" ? "flex-row-reverse" : ""}`}>
        {message.role === "assistant" && avatarImage && (
          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 mt-1">
            <img
              src={avatarImage}
              alt={avatarName}
              className="avatar-image"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 max-w-[80%]">
          {/* Reply Preview */}
          {message.reply_to && message.reply_preview && (
            <div 
              className="mb-2 ml-3 pl-3 border-l-2 border-primary/30 py-1 cursor-pointer hover:bg-accent/20 rounded-r transition-colors"
              onClick={() => onScrollToMessage?.(message.reply_to!)}
            >
              <p className="text-xs text-muted-foreground italic line-clamp-2">
                {message.reply_preview}
              </p>
            </div>
          )}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[100px]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`chat-bubble-enter rounded-2xl px-5 py-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border shadow-sm"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="text-base leading-relaxed">
                  <MarkdownRenderer content={message.content} />
                </div>
              ) : (
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
              )}
              {/* Timestamp and Actions - Two-line responsive layout */}
              <div className="mt-2 space-y-1.5">
                <span className="text-xs opacity-70">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                
                {/* Action Bar - Always visible, two-line responsive layout */}
                <div className="flex flex-wrap gap-1">
                  {/* Line 1: Primary actions */}
                  {onReply && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 transition-all hover:bg-accent hover:shadow-sm"
                      onClick={handleReplyClick}
                      title="Reply"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <ReactionPicker onReact={handleReaction}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 transition-all hover:bg-accent hover:shadow-sm"
                      title="React"
                    >
                      <Smile className="h-3.5 w-3.5" />
                    </Button>
                  </ReactionPicker>
                  {message.role === "assistant" && (
                    <>
                      <TTSButton text={message.content} avatarName={avatarName} />
                      {onRegenerate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2.5 transition-all hover:bg-accent hover:shadow-sm"
                          onClick={() => onRegenerate(message.id)}
                          title="Regenerate"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          {regenerateCount > 1 && <span className="ml-1 text-xs">{regenerateCount}</span>}
                        </Button>
                      )}
                    </>
                  )}
                  
                  {/* Line 2: Secondary actions */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 transition-all hover:bg-accent hover:shadow-sm"
                    onClick={handleCopy}
                    title="Copy"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {message.role === "assistant" && (
                    <>
                      <ShareButton content={message.content} avatarName={avatarName || "Avatar"} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2.5 transition-all hover:bg-accent hover:shadow-sm"
                        onClick={() => handleFeedback("like")}
                        title="Like"
                      >
                        <ThumbsUp className={`h-3.5 w-3.5 transition-all ${feedback === "like" ? "fill-current text-primary" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2.5 transition-all hover:bg-accent hover:shadow-sm"
                        onClick={() => handleFeedback("dislike")}
                        title="Dislike"
                      >
                        <ThumbsDown className={`h-3.5 w-3.5 transition-all ${feedback === "dislike" ? "fill-current text-destructive" : ""}`} />
                      </Button>
                    </>
                  )}
                  {message.role === "user" && onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 transition-all hover:bg-accent hover:shadow-sm"
                      onClick={() => setIsEditing(true)}
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Reactions Display */}
              {Object.keys(groupedReactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(groupedReactions).map(([emoji, data]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-110 ${
                        hasUserReacted(emoji) 
                          ? "bg-primary/20 border border-primary/40" 
                          : "bg-accent/50 border border-accent"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="text-muted-foreground">{data.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {message.role === "assistant" && sessionId && onSelectSuggestion && (
        <div className="ml-11">
          <FollowUpSuggestions
            sessionId={sessionId}
            messageId={message.id}
            onSelect={onSelectSuggestion}
          />
        </div>
      )}
    </div>
  );
}
