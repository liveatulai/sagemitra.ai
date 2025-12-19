import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatExportProps {
  messages: Message[];
  avatarName: string;
}

export default function ChatExport({ messages, avatarName }: ChatExportProps) {
  const exportToMarkdown = () => {
    let markdown = `# Chat with ${avatarName}\n\n`;
    markdown += `Exported on: ${new Date().toLocaleString()}\n\n---\n\n`;

    messages.forEach((msg) => {
      const timestamp = new Date(msg.created_at).toLocaleString();
      const role = msg.role === "user" ? "You" : avatarName;
      markdown += `**${role}** (${timestamp})\n\n${msg.content}\n\n---\n\n`;
    });

    downloadFile(markdown, `chat-${avatarName}-${Date.now()}.md`, "text/markdown");
    toast.success("Chat exported as Markdown");
  };

  const exportToText = () => {
    let text = `Chat with ${avatarName}\n`;
    text += `Exported on: ${new Date().toLocaleString()}\n\n`;
    text += "=".repeat(50) + "\n\n";

    messages.forEach((msg) => {
      const timestamp = new Date(msg.created_at).toLocaleString();
      const role = msg.role === "user" ? "You" : avatarName;
      text += `${role} (${timestamp}):\n${msg.content}\n\n${"-".repeat(50)}\n\n`;
    });

    downloadFile(text, `chat-${avatarName}-${Date.now()}.txt`, "text/plain");
    toast.success("Chat exported as Text");
  };

  const exportToPDF = () => {
    // Create HTML for PDF
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chat with ${avatarName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .metadata { color: #666; font-size: 14px; margin-bottom: 30px; }
    .message { margin-bottom: 30px; padding: 15px; border-radius: 8px; }
    .user { background-color: #e3f2fd; }
    .assistant { background-color: #f5f5f5; }
    .role { font-weight: bold; color: #333; margin-bottom: 5px; }
    .timestamp { font-size: 12px; color: #666; }
    .content { margin-top: 10px; line-height: 1.6; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Chat with ${avatarName}</h1>
  <div class="metadata">Exported on: ${new Date().toLocaleString()}</div>
`;

    messages.forEach((msg) => {
      const timestamp = new Date(msg.created_at).toLocaleString();
      const role = msg.role === "user" ? "You" : avatarName;
      html += `
  <div class="message ${msg.role}">
    <div class="role">${role}</div>
    <div class="timestamp">${timestamp}</div>
    <div class="content">${msg.content}</div>
  </div>
`;
    });

    html += `
</body>
</html>
`;

    downloadFile(html, `chat-${avatarName}-${Date.now()}.html`, "text/html");
    toast.success("Chat exported as HTML (open in browser, then print to PDF)");
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Download className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToMarkdown}>
          Export as Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToText}>
          Export as Text (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          Export as HTML (for PDF)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
