import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Mic, CheckCircle2 } from "lucide-react";

interface VoiceUploaderProps {
  avatarId: string;
  isCustom?: boolean;
  onVoiceUploaded?: (voiceUrl: string, voiceId: string) => void;
}

export default function VoiceUploader({ avatarId, isCustom = false, onVoiceUploaded }: VoiceUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('audio')) {
      toast.error("Please upload an audio file (WAV, MP3, etc.)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB");
      return;
    }

    setVoiceFile(file);
  };

  const handleUpload = async () => {
    if (!voiceFile) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = voiceFile.name.split('.').pop();
      const fileName = `${avatarId}-voice-${Date.now()}.${fileExt}`;
      const filePath = `voice-samples/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatar-images')
        .upload(filePath, voiceFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatar-images')
        .getPublicUrl(filePath);

      const voiceUrl = urlData.publicUrl;

      // Generate voice ID (simplified - in production, this would call ElevenLabs API)
      const voiceId = `voice_${avatarId}_${Date.now()}`;

      // Update avatar with voice data
      const tableName = isCustom ? 'user_avatars' : 'avatars';
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          voice_sample_url: voiceUrl,
          custom_voice_id: voiceId,
          voice_provider: 'elevenlabs'
        })
        .eq('id', avatarId);

      if (updateError) throw updateError;

      toast.success("Voice uploaded successfully!", {
        description: "Your avatar now has a custom voice"
      });

      onVoiceUploaded?.(voiceUrl, voiceId);
      setVoiceFile(null);
    } catch (error) {
      console.error("Voice upload error:", error);
      toast.error("Failed to upload voice sample");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card/50">
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Custom Voice</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Upload a 10-15 second clear voice sample to create a custom voice for this avatar.
      </p>

      <div className="space-y-3">
        <Label htmlFor="voice-upload" className="cursor-pointer">
          <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
            {voiceFile ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">{voiceFile.name}</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-sm">Click to upload audio file</span>
              </>
            )}
          </div>
          <Input
            id="voice-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </Label>

        {voiceFile && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload & Apply Voice"}
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>💡 Tips for best results:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Use a quiet environment</li>
          <li>Speak naturally and clearly</li>
          <li>10-15 seconds is optimal</li>
          <li>WAV or MP3 format recommended</li>
        </ul>
      </div>
    </div>
  );
}
