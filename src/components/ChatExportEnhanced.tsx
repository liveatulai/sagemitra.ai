import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileJson, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  reactions?: any[];
  reply_to?: string;
  reply_preview?: string;
}

interface ChatExportEnhancedProps {
  sessionId: string;
  messages: Message[];
  avatarName: string;
}

export default function ChatExportEnhanced({ sessionId, messages, avatarName }: ChatExportEnhancedProps) {
  const [exporting, setExporting] = useState(false);
  const [shareLink, setShareLink] = useState<string>("");

  const enrichMessagesWithMood = async () => {
    const { data: moods } = await supabase
      .from("mood_logs")
      .select("*")
      .eq("session_id", sessionId);

    return messages.map(msg => {
      const mood = moods?.find(m => m.message_id === msg.id);
      return {
        ...msg,
        mood: mood?.detected_mood,
        sentiment: mood?.sentiment_score,
        keywords: mood?.keywords
      };
    });
  };

  const exportAsJSON = async () => {
    setExporting(true);
    try {
      const enrichedMessages = await enrichMessagesWithMood();
      const exportData = {
        avatar: avatarName,
        sessionId,
        exportDate: new Date().toISOString(),
        totalMessages: enrichedMessages.length,
        messages: enrichedMessages
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${avatarName}-chat-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Chat exported as JSON");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export chat");
    } finally {
      setExporting(false);
    }
  };

  const exportAsHTML = async () => {
    setExporting(true);
    try {
      const enrichedMessages = await enrichMessagesWithMood();
      
      const moodEmojis: Record<string, string> = {
        joyful: "💫",
        calm: "🌊",
        curious: "✨",
        reflective: "🌙",
        loving: "💖",
        anxious: "😰",
        sad: "😔"
      };

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat with ${avatarName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      color: #333;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      text-align: center;
      padding-bottom: 2rem;
      border-bottom: 2px solid #eee;
      margin-bottom: 2rem;
    }
    .header h1 { color: #667eea; margin-bottom: 0.5rem; }
    .header p { color: #666; font-size: 0.9rem; }
    .message {
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
    }
    .message.user { flex-direction: row-reverse; }
    .message-content {
      max-width: 70%;
      padding: 1rem 1.25rem;
      border-radius: 16px;
      position: relative;
    }
    .message.user .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .message.assistant .message-content {
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
    }
    .mood-indicator {
      position: absolute;
      top: -8px;
      right: -8px;
      background: white;
      border-radius: 50%;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      font-size: 1.2rem;
    }
    .timestamp {
      font-size: 0.75rem;
      color: #999;
      margin-top: 0.5rem;
    }
    .reactions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .reaction {
      background: #f0f0f0;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 Conversation with ${avatarName}</h1>
      <p>Exported on ${new Date().toLocaleDateString()}</p>
      <p>${enrichedMessages.length} messages</p>
    </div>
    ${enrichedMessages.map(msg => `
      <div class="message ${msg.role}">
        <div class="message-content">
          ${msg.mood ? `<div class="mood-indicator">${moodEmojis[msg.mood] || '✨'}</div>` : ''}
          <p>${msg.content.replace(/\n/g, '<br>')}</p>
          ${msg.reactions && msg.reactions.length > 0 ? `
            <div class="reactions">
              ${msg.reactions.map((r: any) => `<span class="reaction">${r.emoji}</span>`).join('')}
            </div>
          ` : ''}
          <div class="timestamp">${new Date(msg.created_at).toLocaleString()}</div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
      `;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${avatarName}-chat-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Chat exported as HTML");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export chat");
    } finally {
      setExporting(false);
    }
  };

  const generateShareLink = async () => {
    setExporting(true);
    try {
      // In a real implementation, this would create a shareable session
      // For now, we'll just copy the session URL
      const link = `${window.location.origin}/chat/shared/${sessionId}`;
      await navigator.clipboard.writeText(link);
      setShareLink(link);
      toast.success("Share link copied to clipboard");
    } catch (error) {
      console.error("Share link error:", error);
      toast.error("Failed to generate share link");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Button
            onClick={exportAsJSON}
            disabled={exporting}
            variant="outline"
            className="w-full justify-start gap-3"
          >
            <FileJson className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Export as JSON</div>
              <div className="text-xs text-muted-foreground">
                Complete data with moods & metadata
              </div>
            </div>
          </Button>

          <Button
            onClick={exportAsHTML}
            disabled={exporting}
            variant="outline"
            className="w-full justify-start gap-3"
          >
            <FileText className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Export as HTML</div>
              <div className="text-xs text-muted-foreground">
                Styled webpage with emotions
              </div>
            </div>
          </Button>

          <Button
            onClick={generateShareLink}
            disabled={exporting}
            variant="outline"
            className="w-full justify-start gap-3"
          >
            <Link2 className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Generate Share Link</div>
              <div className="text-xs text-muted-foreground">
                Create read-only shareable link
              </div>
            </div>
          </Button>

          {shareLink && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Share link:</p>
              <p className="text-sm font-mono break-all">{shareLink}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
