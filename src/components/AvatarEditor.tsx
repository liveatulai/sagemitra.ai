import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, Loader2, Save, Link as LinkIcon, Trash2, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import SafeComponent from "./SafeComponent";
import VoiceUploader from "./VoiceUploader";
import { z } from "zod";

const avatarSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  title: z.string()
    .max(150, "Title must be less than 150 characters")
    .optional()
    .or(z.literal("")),
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  personality_prompt: z.string()
    .max(10000, "Personality Prompt must be less than 10,000 characters")
    .optional()
    .or(z.literal("")),
  knowledge_base: z.string()
    .max(50000, "Knowledge Base must be less than 50,000 characters")
    .optional()
    .or(z.literal(""))
});

const imagePromptSchema = z.string()
  .trim()
  .min(1, "Image prompt is required")
  .max(500, "Image prompt must be less than 500 characters");

const urlSchema = z.string()
  .trim()
  .url("Please enter a valid URL")
  .max(2048, "URL is too long");

interface AvatarEditorProps {
  avatar: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function AvatarEditor({ avatar, open, onOpenChange, onSaved }: AvatarEditorProps) {
  const [editedAvatar, setEditedAvatar] = useState(avatar);
  const [imagePrompt, setImagePrompt] = useState(avatar.name || "");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState(avatar.image_url || "");
  const [imageOpen, setImageOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  
  // Separate loading states for different actions
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [optimizingDescription, setOptimizingDescription] = useState(false);
  const [optimizingPersonality, setOptimizingPersonality] = useState(false);
  const [fetchingKnowledge, setFetchingKnowledge] = useState(false);
  const [processingDocs, setProcessingDocs] = useState(false);
  const [searchingImages, setSearchingImages] = useState(false);
  const [referenceImages, setReferenceImages] = useState<{ url: string; source: string; trusted: boolean }[]>([]);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [selectedReferenceUrl, setSelectedReferenceUrl] = useState<string | null>(null);
  const [generatingFromReference, setGeneratingFromReference] = useState(false);
  const [imageSourceFilter, setImageSourceFilter] = useState<'all' | 'wikipedia' | 'official'>('all');
  const [hasMoreImages, setHasMoreImages] = useState(false);
  const [imageOffset, setImageOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  const regenerateImage = async () => {
    const validated = imagePromptSchema.safeParse(imagePrompt);
    
    if (!validated.success) {
      toast.error(validated.error.errors[0].message);
      return;
    }

    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar-image', {
        body: { 
          prompt: validated.data,
          avatarId: avatar.id
        }
      });

      if (!isMounted) return;

      if (error) {
        console.error('Image generation error:', error);
        const errorMessage = error.message || data?.error || "Failed to regenerate image";
        toast.error(errorMessage);
        return;
      }

      if (data?.imageUrl) {
        const newUrl = `${data.imageUrl}?t=${Date.now()}`;
        setEditedAvatar({ ...editedAvatar, image_url: newUrl, image_source: 'ai-generated' });
        setPreviewUrl(newUrl);
        toast.success("Image regenerated successfully!");
        setImagePrompt("");
      }
    } catch (error: any) {
      console.error('Error in regenerateImage:', error);
      if (!isMounted) return;
      const errorMessage = error.context?.body?.error || error.message || "Failed to regenerate image";
      toast.error(errorMessage);
    } finally {
      if (isMounted) {
        setGeneratingImage(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Get the current user's ID for folder-based storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to upload images");
        setUploadingImage(false);
        return;
      }

      const fileName = `${avatar.id}-${Date.now()}.png`;
      // Use user's ID as folder name for RLS compliance
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatar-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatar-images')
        .getPublicUrl(filePath);
      
      const newUrl = `${publicUrl}?t=${Date.now()}`;
      setEditedAvatar({ ...editedAvatar, image_url: newUrl, image_source: 'upload' });
      setPreviewUrl(newUrl);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchImageFromUrl = async () => {
    const validated = urlSchema.safeParse(imageUrl);
    
    if (!validated.success) {
      toast.error(validated.error.errors[0].message);
      return;
    }

    setFetchingUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-image-from-url', {
        body: { 
          imageUrl: validated.data,
          avatarId: avatar.id
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const newUrl = `${data.imageUrl}?t=${Date.now()}`;
        setEditedAvatar({ ...editedAvatar, image_url: newUrl, image_source: 'url-import' });
        setPreviewUrl(newUrl);
        toast.success("Image imported successfully!");
        setImageUrl("");
      }
    } catch (error: any) {
      toast.error("Failed to fetch image from URL");
    } finally {
      setFetchingUrl(false);
    }
  };

  const searchReferenceImages = async (loadMore = false) => {
    if (!editedAvatar.name?.trim()) {
      toast.error("Please enter an avatar name first");
      return;
    }

    if (loadMore) {
      setLoadingMore(true);
    } else {
      setSearchingImages(true);
      setShowImageSearch(true);
      setReferenceImages([]);
      setImageOffset(0);
    }

    // Build accurate search query using name, title, and description
    const searchParts = [editedAvatar.name];
    if (editedAvatar.title) searchParts.push(editedAvatar.title);
    if (editedAvatar.description) {
      const shortDesc = editedAvatar.description.substring(0, 100);
      searchParts.push(shortDesc);
    }
    const searchQuery = searchParts.join(' ').trim();
    const currentOffset = loadMore ? imageOffset : 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to search for images");
        return;
      }

      const { data, error } = await supabase.functions.invoke('search-reference-images', {
        body: { 
          query: searchQuery,
          limit: 12,
          offset: currentOffset,
          sourceFilter: imageSourceFilter
        }
      });

      if (error) throw error;

      if (data?.sources && Array.isArray(data.sources)) {
        if (loadMore) {
          setReferenceImages(prev => [...prev, ...data.sources]);
        } else {
          setReferenceImages(data.sources);
        }
        setHasMoreImages(data.hasMore || false);
        setImageOffset(currentOffset + data.sources.length);
        
        if (!loadMore && data.sources.length === 0) {
          toast.info("No reference images found. Try uploading an image instead.");
        }
      } else {
        if (!loadMore) toast.error("No images found");
      }
    } catch (error: any) {
      console.error('Error searching images:', error);
      toast.error(error.message || "Failed to search for images");
    } finally {
      setSearchingImages(false);
      setLoadingMore(false);
    }
  };

  const selectReferenceImage = (url: string) => {
    // Show options for what to do with the selected image
    setSelectedReferenceUrl(url);
  };

  const useReferenceDirectly = async () => {
    if (!selectedReferenceUrl) return;
    
    setFetchingUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-image-from-url', {
        body: { 
          imageUrl: selectedReferenceUrl,
          avatarId: avatar.id
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const newUrl = `${data.imageUrl}?t=${Date.now()}`;
        setEditedAvatar({ ...editedAvatar, image_url: newUrl, image_source: 'url-import' });
        setPreviewUrl(newUrl);
        toast.success("Reference image applied!");
        closeImageSearch();
      }
    } catch (error: any) {
      toast.error("Failed to use this image. Try another one.");
    } finally {
      setFetchingUrl(false);
    }
  };

  const generateFromReference = async () => {
    if (!selectedReferenceUrl) return;
    
    setGeneratingFromReference(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar-image', {
        body: { 
          prompt: editedAvatar.name || 'portrait',
          avatarId: avatar.id,
          referenceImageUrl: selectedReferenceUrl
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const newUrl = `${data.imageUrl}?t=${Date.now()}`;
        setEditedAvatar({ ...editedAvatar, image_url: newUrl, image_source: 'ai-generated' });
        setPreviewUrl(newUrl);
        toast.success("AI avatar generated from reference!");
        closeImageSearch();
      }
    } catch (error: any) {
      console.error('Error generating from reference:', error);
      toast.error(error.message || "Failed to generate image. Try again.");
    } finally {
      setGeneratingFromReference(false);
    }
  };

  const closeImageSearch = () => {
    setShowImageSearch(false);
    setReferenceImages([]);
    setSelectedReferenceUrl(null);
  };

  const optimizeField = async (field: 'description' | 'personality_prompt') => {
    if (!isMounted) return;

    const setFieldLoading = field === 'description' ? setOptimizingDescription : setOptimizingPersonality;
    setFieldLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in again to use AI optimization");
        setFieldLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-avatar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: editedAvatar.name,
            title: editedAvatar.title,
            field: field,
            current_value: field === 'description' 
              ? (editedAvatar.description || "") 
              : editedAvatar.personality_prompt,
            knowledge_base: editedAvatar.knowledge_base || ""
          })
        }
      );

      if (!isMounted) {
        setFieldLoading(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error || "Failed to optimize";
        const errorCode = data?.code;
        const retryAfter = data?.retryAfter;
        
        if (errorCode === 'E005' || response.status === 402 || errorMessage.includes('Insufficient credits')) {
          toast.error("Insufficient credits for AI optimization.");
        } else if (errorCode === 'RATE_LIMIT_EXCEEDED' || response.status === 429) {
          const retryMessage = retryAfter && retryAfter > 60 
            ? `Rate limit exceeded. Please wait ${Math.ceil(retryAfter / 60)} minute(s).`
            : `Rate limit exceeded. Please wait ${retryAfter || 60} seconds.`;
          toast.error(retryMessage, { duration: 6000 });
        } else {
          toast.error(errorMessage);
        }
        setFieldLoading(false);
        return;
      }

      if (!data || !data.optimized_value) {
        toast.error("Received invalid response from AI. Please try again.");
        setFieldLoading(false);
        return;
      }

      // Apply the optimization directly
      if (field === 'description') {
        setEditedAvatar({ ...editedAvatar, description: data.optimized_value, is_optimized: true });
        toast.success("Description optimized!");
      } else {
        setEditedAvatar({ ...editedAvatar, personality_prompt: data.optimized_value, is_optimized: true });
        toast.success("Personality prompt optimized!");
      }
      setFieldLoading(false);
    } catch (error: any) {
      console.error(`Error optimizing ${field}:`, error);
      if (isMounted) {
        toast.error(error?.message || "An unexpected error occurred.");
        setFieldLoading(false);
      }
    }
  };

  const saveChanges = async () => {
    // Validate all fields
    const validated = avatarSchema.safeParse({
      name: editedAvatar.name,
      title: editedAvatar.title || "",
      description: editedAvatar.description || "",
      personality_prompt: editedAvatar.personality_prompt,
      knowledge_base: editedAvatar.knowledge_base || ""
    });

    if (!validated.success) {
      // Show all validation errors with field names
      const errorMessages = validated.error.errors.map(err => err.message).join(", ");
      toast.error(errorMessages);
      return;
    }

    setSavingChanges(true);
    try {
      // Check if this is a default avatar or user avatar
      const isUserAvatar = 'user_id' in avatar;
      const table = isUserAvatar ? 'user_avatars' : 'avatars';

      const updates: any = {
        name: validated.data.name,
        title: validated.data.title || '',
        description: validated.data.description || '',
        personality_prompt: validated.data.personality_prompt,
        image_url: editedAvatar.image_url || null,
        image_source: editedAvatar.image_source || 'default',
        is_optimized: editedAvatar.is_optimized || false,
        updated_at: new Date().toISOString()
      };

      // Only include user avatar specific fields
      if (isUserAvatar) {
        updates.persona_profile = editedAvatar.persona_profile || {};
        updates.knowledge_base = validated.data.knowledge_base || '';
        updates.category = editedAvatar.category || 'custom';
        updates.custom_category = editedAvatar.custom_category || null;
      } else {
        // For default avatars, update strength and persona_profile if they exist
        updates.strength = editedAvatar.strength || null;
        updates.category = editedAvatar.category || 'sage';
        if (editedAvatar.persona_profile) {
          updates.persona_profile = editedAvatar.persona_profile;
        }
      }

      console.log('Saving avatar updates:', { table, avatarId: avatar.id, updates });

      const { data: updatedAvatar, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', avatar.id)
        .select()
        .single();

      if (error) {
        console.error('Error saving avatar:', error);
        throw error;
      }

      console.log('Avatar updated successfully:', updatedAvatar);
      
      // Update local state with fresh data from DB
      if (updatedAvatar) {
        setEditedAvatar(updatedAvatar);
        if (updatedAvatar.image_url) {
          setPreviewUrl(`${updatedAvatar.image_url}?t=${Date.now()}`);
        }
      }

      toast.success("Avatar updated successfully!");
      
      // Call onSaved first to refresh parent data
      onSaved?.();
      
      // Small delay to ensure data is refreshed before closing
      setTimeout(() => {
        onOpenChange(false);
      }, 300);
    } catch (error: any) {
      console.error('Error in saveChanges:', error);
      toast.error(error.message || "Failed to save changes. Please try again.");
    } finally {
      setSavingChanges(false);
    }
  };

  const deleteAvatar = async () => {
    if (!('user_id' in avatar)) {
      toast.error("Cannot delete default avatars");
      return;
    }
    
    if (!confirm("Delete this avatar permanently?")) return;

    setSavingChanges(true);
    try {
      await supabase.from('user_avatars').update({ deleted_at: new Date().toISOString() }).eq('id', avatar.id);
      toast.success("Avatar deleted");
      onOpenChange(false);
      onSaved?.();
    } catch (error: any) {
      toast.error("Failed to delete");
    } finally {
      setSavingChanges(false);
    }
  };

  return (
    <SafeComponent>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] sm:h-[95vh] flex flex-col p-0 gap-0 max-w-2xl w-full sm:w-[95vw] rounded-none sm:rounded-lg">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold">Edit Avatar</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-6 pb-4">
            {/* Avatar Image Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-2 ring-border shadow-lg">
                {(generatingImage || uploadingImage || fetchingUrl) ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Skeleton className="w-full h-full rounded-full absolute inset-0" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">
                        {generatingImage ? 'Generating...' : uploadingImage ? 'Uploading...' : 'Fetching...'}
                      </span>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={editedAvatar.name}
                    className="w-full h-full object-cover"
                    style={{ aspectRatio: '1/1' }}
                    key={previewUrl}
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <Collapsible open={imageOpen} onOpenChange={setImageOpen} className="w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    {imageOpen ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                    Change Avatar Image
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  {/* AI Generation */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe the image..."
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && regenerateImage()}
                      className="flex-1 text-sm"
                    />
                    <Button onClick={regenerateImage} disabled={generatingImage || !imagePrompt.trim()} size="sm">
                      {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* URL Import */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Or paste an image URL..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchImageFromUrl()}
                      className="flex-1 text-sm"
                    />
                    <Button onClick={fetchImageFromUrl} disabled={fetchingUrl || !imageUrl.trim()} size="sm">
                      {fetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* File Upload */}
                  <label className="block">
                    <Button variant="outline" className="w-full" disabled={uploadingImage} size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Custom Image
                      </span>
                    </Button>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  {/* Search Reference Images */}
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="sm"
                    onClick={() => searchReferenceImages(false)}
                    disabled={searchingImages || !editedAvatar.name?.trim()}
                  >
                    {searchingImages ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Search Reference Images
                  </Button>

                  {/* Reference Images Results */}
                  {showImageSearch && (
                    <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {searchingImages ? 'Searching...' : selectedReferenceUrl ? 'Selected image' : `Found ${referenceImages.length} images`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={closeImageSearch}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      {/* Source Filter */}
                      {!selectedReferenceUrl && !searchingImages && (
                        <div className="flex gap-1 mb-3">
                          <Button
                            size="sm"
                            variant={imageSourceFilter === 'all' ? 'default' : 'outline'}
                            className="h-6 text-xs px-2"
                            onClick={() => { setImageSourceFilter('all'); searchReferenceImages(false); }}
                          >
                            All
                          </Button>
                          <Button
                            size="sm"
                            variant={imageSourceFilter === 'wikipedia' ? 'default' : 'outline'}
                            className="h-6 text-xs px-2"
                            onClick={() => { setImageSourceFilter('wikipedia'); searchReferenceImages(false); }}
                          >
                            Wikipedia
                          </Button>
                          <Button
                            size="sm"
                            variant={imageSourceFilter === 'official' ? 'default' : 'outline'}
                            className="h-6 text-xs px-2"
                            onClick={() => { setImageSourceFilter('official'); searchReferenceImages(false); }}
                          >
                            Official
                          </Button>
                        </div>
                      )}
                      
                      {/* Selected image - show options */}
                      {selectedReferenceUrl ? (
                        <div className="space-y-3">
                          <div className="flex justify-center">
                            <img
                              src={selectedReferenceUrl}
                              alt="Selected reference"
                              className="w-24 h-24 object-cover rounded-lg border-2 border-primary"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={useReferenceDirectly}
                              disabled={fetchingUrl || generatingFromReference}
                              className="w-full"
                            >
                              {fetchingUrl ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              Use This Image Directly
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={generateFromReference}
                              disabled={fetchingUrl || generatingFromReference}
                              className="w-full"
                            >
                              {generatingFromReference ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                              Generate AI Styled Version
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedReferenceUrl(null)}
                              disabled={fetchingUrl || generatingFromReference}
                              className="w-full"
                            >
                              Choose Different Image
                            </Button>
                          </div>
                        </div>
                      ) : searchingImages ? (
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="aspect-square rounded-md" />
                          ))}
                        </div>
                      ) : referenceImages.length > 0 ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {referenceImages.map((img, index) => (
                              <button
                                key={index}
                                onClick={() => selectReferenceImage(img.url)}
                                disabled={fetchingUrl}
                                className="relative aspect-square rounded-md overflow-hidden border-2 border-transparent hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary group"
                              >
                                <img
                                  src={img.url}
                                  alt={`Reference ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                  }}
                                />
                                {img.trusted && (
                                  <span className="absolute top-0.5 right-0.5 bg-green-500 text-white text-[8px] px-1 rounded">
                                    ✓
                                  </span>
                                )}
                                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                  {img.source}
                                </span>
                              </button>
                            ))}
                          </div>
                          {hasMoreImages && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full h-7 text-xs"
                              onClick={() => searchReferenceImages(true)}
                              disabled={loadingMore}
                            >
                              {loadingMore ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                              Load More Images
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No images found. Try uploading an image instead.
                        </p>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
                <Input
                  id="name"
                  value={editedAvatar.name}
                  onChange={(e) => setEditedAvatar({ ...editedAvatar, name: e.target.value })}
                  placeholder="Avatar name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                <Input
                  id="title"
                  value={editedAvatar.title}
                  onChange={(e) => setEditedAvatar({ ...editedAvatar, title: e.target.value })}
                  placeholder="e.g., Philosopher Saint, Innovator..."
                />
              </div>

              {'user_id' in avatar && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                    <Select value={editedAvatar.category || 'custom'} onValueChange={(v) => setEditedAvatar({...editedAvatar, category: v})}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sage">Sage</SelectItem>
                        <SelectItem value="innovator">Innovator</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => optimizeField('description')}
                    disabled={optimizingDescription || !editedAvatar.name}
                    className="h-7 text-xs gap-1"
                  >
                    {optimizingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Optimize
                  </Button>
                </div>
                <Textarea
                  id="description"
                  value={editedAvatar.description || ""}
                  onChange={(e) => setEditedAvatar({ ...editedAvatar, description: e.target.value })}
                  rows={3}
                  placeholder="A compelling 2-3 sentence description..."
                  className="resize-none text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Personality Configuration */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Personality Configuration</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="personality" className="text-sm font-medium">Personality Prompt (Optional Override)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => optimizeField('personality_prompt')}
                    disabled={optimizingPersonality || !editedAvatar.name}
                    className="h-7 text-xs gap-1"
                  >
                    {optimizingPersonality ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Optimize
                  </Button>
                </div>
                <Textarea
                  id="personality"
                  value={editedAvatar.personality_prompt}
                  onChange={(e) => setEditedAvatar({ ...editedAvatar, personality_prompt: e.target.value })}
                  rows={6}
                  className="font-mono text-xs resize-none"
                  placeholder="Define how this avatar speaks, core philosophy, response guidelines..."
                />
              </div>
            </div>

            <Separator />

            {/* Knowledge Base */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Knowledge Base</h3>
                <Button variant="ghost" size="sm" onClick={() => setKnowledgeOpen(!knowledgeOpen)}>
                  {knowledgeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
              
              <Collapsible open={knowledgeOpen} onOpenChange={setKnowledgeOpen}>
                <CollapsibleContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="knowledge" className="text-sm font-medium">Knowledge Base Content</Label>
                    <Textarea
                      id="knowledge"
                      value={editedAvatar.knowledge_base || ""}
                      onChange={(e) => setEditedAvatar({ ...editedAvatar, knowledge_base: e.target.value })}
                      placeholder="Additional context, facts, teachings, stories..."
                      rows={5}
                      className="font-mono text-xs resize-none"
                    />
                  </div>

                  {/* Website Import */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Import from Website</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste website URL..."
                        value={editedAvatar.knowledge_url || ""}
                        onChange={(e) => setEditedAvatar({ ...editedAvatar, knowledge_url: e.target.value })}
                        className="flex-1 text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          const validated = urlSchema.safeParse(editedAvatar.knowledge_url);
                          
                          if (!validated.success) {
                            toast.error(validated.error.errors[0].message);
                            return;
                          }
                          
                          setFetchingKnowledge(true);
                          try {
                            const { data, error } = await supabase.functions.invoke('fetch-knowledge-from-url', {
                              body: { url: validated.data }
                            });
                            if (error) throw error;
                            if (data?.content) {
                              const currentKnowledge = editedAvatar.knowledge_base || "";
                              const newKnowledge = currentKnowledge 
                                ? `${currentKnowledge}\n\n--- Content from ${validated.data} ---\n${data.content}`
                                : data.content;
                              setEditedAvatar({ ...editedAvatar, knowledge_base: newKnowledge, knowledge_url: "" });
                              toast.success("Website content extracted!");
                            }
                          } catch (error: any) {
                            toast.error("Failed to fetch website content");
                          } finally {
                            setFetchingKnowledge(false);
                          }
                        }}
                        disabled={fetchingKnowledge || !editedAvatar.knowledge_url?.trim()}
                      >
                        {fetchingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
                      </Button>
                    </div>
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Upload Documents</Label>
                    <label className="block">
                      <Button variant="outline" className="w-full" disabled={processingDocs} size="sm" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload PDF, TXT, MD, DOCX
                        </span>
                      </Button>
                      <input 
                        type="file" 
                        accept=".pdf,.txt,.md,.doc,.docx" 
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          
                          setProcessingDocs(true);
                          try {
                            let allContent = "";
                            
                            for (const file of files) {
                              const fileExt = file.name.split('.').pop()?.toLowerCase();
                              
                              if (fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'doc') {
                                const formData = new FormData();
                                formData.append('file', file);
                                
                                const { data, error } = await supabase.functions.invoke('parse-document', {
                                  body: formData
                                });
                                
                                if (error) {
                                  console.error(`Error parsing ${file.name}:`, error);
                                  toast.error(`Failed to parse ${file.name}`);
                                  continue;
                                }
                                
                                if (data?.content) {
                                  allContent += `\n\n--- Content from ${file.name} ---\n${data.content}`;
                                }
                              } else {
                                const text = await file.text();
                                allContent += `\n\n--- Content from ${file.name} ---\n${text}`;
                              }
                            }
                            
                            const currentKnowledge = editedAvatar.knowledge_base || "";
                            const newKnowledge = currentKnowledge 
                              ? `${currentKnowledge}${allContent}`
                              : allContent.trim();
                            
                            setEditedAvatar({ ...editedAvatar, knowledge_base: newKnowledge });
                            toast.success(`${files.length} document(s) processed successfully!`);
                            
                            e.target.value = '';
                          } catch (error: any) {
                            console.error('Error processing files:', error);
                            toast.error("Failed to process files");
                          } finally {
                            setProcessingDocs(false);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Voice Upload Section */}
            {editedAvatar && (
              <VoiceUploader
                avatarId={editedAvatar.id}
                isCustom={!('persona_profile' in editedAvatar)}
                onVoiceUploaded={(voiceUrl, voiceId) => {
                  toast.success("Custom voice applied successfully");
                  console.log("Voice uploaded:", voiceUrl, voiceId);
                }}
              />
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions - Fixed on mobile with safe area */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t bg-background/95 backdrop-blur-sm pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto sm:min-w-[100px]"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveChanges} 
              disabled={savingChanges || optimizingDescription || optimizingPersonality || generatingImage} 
              className="w-full sm:flex-1"
              size="lg"
            >
              {savingChanges ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </SafeComponent>
  );
}