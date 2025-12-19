import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import SafeComponent from "./SafeComponent";

interface OptimizePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: {
    description: string;
    personality_prompt: string;
    knowledge_base: string;
  };
  optimized: {
    optimized_description?: string;
    optimized_personality_prompt?: string;
    optimized_knowledge_base?: string;
    improvements_made?: string[];
  } | null;
  onApply: (selected: {
    description?: string;
    personality_prompt?: string;
    knowledge_base?: string;
  }) => void;
}

export default function OptimizePreviewModal({
  open,
  onOpenChange,
  original,
  optimized,
  onApply,
}: OptimizePreviewModalProps) {
  const [selectedFields, setSelectedFields] = useState({
    description: true,
    personality_prompt: true,
    knowledge_base: true,
  });

  // Return null if optimized data is invalid
  if (!optimized || !optimized.optimized_description || !optimized.optimized_personality_prompt) {
    return null;
  }

  const handleApply = () => {
    const updates: any = {};
    if (selectedFields.description && optimized.optimized_description) {
      updates.description = optimized.optimized_description;
    }
    if (selectedFields.personality_prompt && optimized.optimized_personality_prompt) {
      updates.personality_prompt = optimized.optimized_personality_prompt;
    }
    if (selectedFields.knowledge_base && optimized.optimized_knowledge_base) {
      updates.knowledge_base = optimized.optimized_knowledge_base;
    }
    onApply(updates);
    onOpenChange(false);
  };

  return (
    <SafeComponent>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Optimization Preview
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Improvements Summary */}
            {optimized.improvements_made && optimized.improvements_made.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Key Improvements
                </h3>
                <ul className="space-y-1 text-sm">
                  {optimized.improvements_made.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description Comparison */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="desc"
                  checked={selectedFields.description}
                  onCheckedChange={(checked) =>
                    setSelectedFields({ ...selectedFields, description: !!checked })
                  }
                />
                <Label htmlFor="desc" className="font-medium cursor-pointer">
                  Description
                </Label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Badge variant="secondary">Original</Badge>
                  <div className="bg-secondary/20 rounded-lg p-3 text-sm">
                    {original.description || <span className="text-muted-foreground italic">Not specified</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Badge variant="default">Optimized</Badge>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                    {optimized.optimized_description}
                  </div>
                </div>
              </div>
            </div>

            {/* Personality Prompt Comparison */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="prompt"
                  checked={selectedFields.personality_prompt}
                  onCheckedChange={(checked) =>
                    setSelectedFields({ ...selectedFields, personality_prompt: !!checked })
                  }
                />
                <Label htmlFor="prompt" className="font-medium cursor-pointer">
                  Personality Prompt (System Prompt)
                </Label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Badge variant="secondary">Original</Badge>
                  <ScrollArea className="h-64 bg-secondary/20 rounded-lg p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {original.personality_prompt}
                    </pre>
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Badge variant="default">Optimized</Badge>
                  <ScrollArea className="h-64 bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {optimized.optimized_personality_prompt}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>

            {/* Knowledge Base Comparison */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="kb"
                  checked={selectedFields.knowledge_base}
                  onCheckedChange={(checked) =>
                    setSelectedFields({ ...selectedFields, knowledge_base: !!checked })
                  }
                />
                <Label htmlFor="kb" className="font-medium cursor-pointer">
                  Knowledge Base
                </Label>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Badge variant="secondary">Original</Badge>
                  <ScrollArea className="h-48 bg-secondary/20 rounded-lg p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {original.knowledge_base || <span className="text-muted-foreground italic">Not specified</span>}
                    </pre>
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Badge variant="default">Optimized</Badge>
                  <ScrollArea className="h-48 bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {optimized.optimized_knowledge_base}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 flex-shrink-0 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!Object.values(selectedFields).some(v => v)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Apply Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </SafeComponent>
  );
}
