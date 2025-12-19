import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareButtonProps {
  content: string;
  avatarName: string;
}

export default function ShareButton({ content, avatarName }: ShareButtonProps) {
  const siteUrl = window.location.origin;
  const referralLink = `${siteUrl}?ref=shared`;
  
  const shareText = `"${content.slice(0, 150)}${content.length > 150 ? "..." : ""}" - ${avatarName} on SageMitra\n\n✨ Chat with legendary minds at ${referralLink}`;

  const handleShare = (platform: string) => {
    let url = "";
    
    switch (platform) {
      case "twitter":
      case "x":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}&summary=${encodeURIComponent(shareText)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(shareText);
        toast.success("Copied to clipboard!");
        return;
    }
    
    if (url) {
      window.open(url, "_blank", "width=600,height=400");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 px-2.5">
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleShare("x")}>
          Share on 𝕏 (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
          Share on WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("linkedin")}>
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("copy")}>
          Copy Share Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
