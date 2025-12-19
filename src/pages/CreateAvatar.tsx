import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Upload, Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import SafeComponent from "@/components/SafeComponent";

export default function CreateAvatar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"chat" | "preview" | "image">("chat");
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    if (!user) {
      toast.error("Please sign in to create avatars");
      navigate("/auth");
    }
    
    return () => {
      setIsMounted(false);
    };
  }, [user, navigate]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarProfile, setAvatarProfile] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageUrlInput, setImageUrlInput] = useState<string>("");
  const [knowledgeUrlInput, setKnowledgeUrlInput] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const newMessages = [...chatMessages, { role: "user", content: currentMessage }];
    setChatMessages(newMessages);
    setCurrentMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-avatar', {
        body: { 
          messages: newMessages
        }
      });

      if (error) throw error;

      if (data?.profile) {
        setAvatarProfile(data.profile);
        setStep("preview");
        toast.success("Avatar profile generated! Review and customize.");
      }
    } catch (error: any) {
      console.error('Error creating avatar:', error);
      toast.error(error.message || "Failed to generate avatar profile");
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!avatarProfile || !isMounted) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar-image", {
        body: {
          prompt: avatarProfile.image_prompt || `${avatarProfile.name}, ${avatarProfile.title}`,
          avatarId: crypto.randomUUID(),
        },
      });

      if (!isMounted) return;

      if (error) {
        console.error("Image generation error:", error);
        const status = (error as any)?.context?.status as number | undefined;
        const bodyErr = (error as any)?.context?.body?.error as string | undefined;
        const retryAfterSeconds = (error as any)?.context?.body?.retryAfterSeconds as number | null | undefined;

        if (status === 429) {
          toast.error(
            retryAfterSeconds
              ? `Gemini rate limit reached. Try again in ~${retryAfterSeconds}s.`
              : "Gemini rate limit reached. Please try again shortly."
          );
          return;
        }

        toast.error(bodyErr || error.message || data?.error || "Failed to generate image");
        return;
      }

      if (data?.imageUrl) {
        const newUrl = `${data.imageUrl}?t=${Date.now()}`;
        setImageUrl(newUrl);
        setStep("image");
        toast.success("Image generated successfully!");
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      if (!isMounted) return;
      const status = error?.context?.status as number | undefined;
      const bodyErr = error?.context?.body?.error as string | undefined;
      const retryAfterSeconds = error?.context?.body?.retryAfterSeconds as number | null | undefined;

      if (status === 429) {
        toast.error(
          retryAfterSeconds
            ? `Gemini rate limit reached. Try again in ~${retryAfterSeconds}s.`
            : "Gemini rate limit reached. Please try again shortly."
        );
        return;
      }

      toast.error(bodyErr || error.message || "Failed to generate image");
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      setStep("image");
    };
    reader.readAsDataURL(file);
  };

  const fetchImageFromUrl = async () => {
    if (!imageUrlInput.trim()) {
      toast.error("Please enter an image URL");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-image-from-url', {
        body: { 
          imageUrl: imageUrlInput.trim(),
          avatarId: crypto.randomUUID()
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setImageUrl(`${data.imageUrl}?t=${Date.now()}`);
        setStep("image");
        toast.success("Image imported successfully!");
        setImageUrlInput("");
      }
    } catch (error: any) {
      console.error('Error fetching image from URL:', error);
      toast.error(error.message || "Failed to fetch image from URL");
    } finally {
      setLoading(false);
    }
  };

  const saveAvatar = async () => {
    if (!avatarProfile) return;

    // Validate required fields
    const trimmedName = avatarProfile.name?.trim();
    const trimmedPrompt = avatarProfile.personality_prompt?.trim();

    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }

    if (!trimmedPrompt) {
      toast.error("Personality Prompt is required");
      return;
    }
    
    setLoading(true);
    try {
      // Upload file if manual upload
      let finalImageUrl = imageUrl;
      let imageSource = 'ai-generated';

      if (uploadFile) {
        const fileName = `${crypto.randomUUID()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatar-images')
          .upload(`public/${fileName}`, uploadFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatar-images')
          .getPublicUrl(`public/${fileName}`);
        
        finalImageUrl = publicUrl;
        imageSource = 'upload';
      } else if (imageUrlInput) {
        imageSource = 'url-import';
      }

      if (!user?.id) {
        toast.error("Please sign in to create avatars");
        navigate("/auth");
        return;
      }

      const { data: insertData, error } = await supabase.from('user_avatars').insert({
        user_id: user.id,
        name: trimmedName,
        title: avatarProfile.title,
        description: avatarProfile.description,
        category: avatarProfile.category,
        personality_prompt: trimmedPrompt,
        persona_profile: avatarProfile.persona_profile,
        knowledge_base: avatarProfile.knowledge_base,
        image_url: finalImageUrl,
        image_source: imageSource,
        is_public: false,
        tags: tags
      }).select();

      if (error) throw error;

      console.log('Avatar created:', insertData);
      toast.success("Avatar created successfully!");
      
      // Wait a bit before navigating to ensure data is committed
      setTimeout(() => navigate('/'), 500);
    } catch (error: any) {
      console.error('Error saving avatar:', error);
      toast.error(error.message || "Failed to save avatar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeComponent>
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4">
        <div className="max-w-3xl mx-auto pt-8">
        <Button
          variant="ghost"
          onClick={() => step === "chat" ? navigate('/') : setStep("chat")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Create Custom Avatar
        </h1>
        <p className="text-muted-foreground mb-8">
          {step === "chat" && "Describe who you'd like to create"}
          {step === "preview" && "Review and customize your avatar"}
          {step === "image" && "Finalize your avatar image"}
        </p>

        {step === "chat" && (
          <Card className="p-6">
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <p>Tell me about the avatar you want to create.</p>
                  <p className="text-sm mt-2">Example: "Create Marcus Aurelius, the Stoic emperor"</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Describe the avatar..."
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !currentMessage.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </Card>
        )}

        {step === "preview" && avatarProfile && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={avatarProfile.name}
                    onChange={(e) => setAvatarProfile({ ...avatarProfile, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={avatarProfile.title}
                    onChange={(e) => setAvatarProfile({ ...avatarProfile, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={avatarProfile.description}
                    onChange={(e) => setAvatarProfile({ ...avatarProfile, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Personality Prompt</label>
                  <Textarea
                    value={avatarProfile.personality_prompt}
                    onChange={(e) => setAvatarProfile({ ...avatarProfile, personality_prompt: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Knowledge Base (Optional)</label>
                  <Textarea
                    value={avatarProfile.knowledge_base || ""}
                    onChange={(e) => setAvatarProfile({ ...avatarProfile, knowledge_base: e.target.value })}
                    placeholder="Additional context, facts, or knowledge about this avatar..."
                    rows={4}
                  />
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Or paste a website URL to extract content..."
                      value={knowledgeUrlInput}
                      onChange={(e) => setKnowledgeUrlInput(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (!knowledgeUrlInput.trim()) {
                          toast.error("Please enter a URL");
                          return;
                        }
                        setLoading(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('fetch-knowledge-from-url', {
                            body: { url: knowledgeUrlInput.trim() }
                          });
                          if (error) throw error;
                          if (data?.content) {
                            const currentKnowledge = avatarProfile.knowledge_base || "";
                            const newKnowledge = currentKnowledge 
                              ? `${currentKnowledge}\n\n--- Content from ${knowledgeUrlInput} ---\n${data.content}`
                              : data.content;
                            setAvatarProfile({ ...avatarProfile, knowledge_base: newKnowledge });
                            setKnowledgeUrlInput("");
                            toast.success("Website content extracted!");
                          }
                        } catch (error: any) {
                          console.error('Error fetching URL:', error);
                          toast.error(error.message || "Failed to fetch website content");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !knowledgeUrlInput.trim()}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
                    </Button>
                  </div>
                  
                  <label className="block mt-2">
                    <Button variant="outline" className="w-full" disabled={loading} asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Documents (PDF, TXT, MD, DOCX) - Multiple files supported
                      </span>
                    </Button>
                    <input 
                      type="file" 
                      accept=".pdf,.txt,.md,.doc,.docx" 
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        
                        setLoading(true);
                        try {
                          let allContent = "";
                          
                          for (const file of files) {
                            const fileExt = file.name.split('.').pop()?.toLowerCase();
                            
                            // For PDFs and DOCX, use edge function to parse
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
                              // For text files, read directly
                              const text = await file.text();
                              allContent += `\n\n--- Content from ${file.name} ---\n${text}`;
                            }
                          }
                          
                          const currentKnowledge = avatarProfile.knowledge_base || "";
                          const newKnowledge = currentKnowledge 
                            ? `${currentKnowledge}${allContent}`
                            : allContent.trim();
                          
                          setAvatarProfile({ ...avatarProfile, knowledge_base: newKnowledge });
                          toast.success(`${files.length} document(s) processed successfully!`);
                          
                          // Reset the input
                          e.target.value = '';
                        } catch (error: any) {
                          console.error('Error processing files:', error);
                          toast.error("Failed to process files");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="hidden" 
                    />
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium">Tags (Optional)</label>
                  <p className="text-xs text-muted-foreground mb-2">Add tags to organize and find your avatar easily</p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a tag (e.g., philosophy, science, business)..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && tagInput.trim()) {
                          e.preventDefault();
                          if (!tags.includes(tagInput.trim())) {
                            setTags([...tags, tagInput.trim()]);
                          }
                          setTagInput("");
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                          setTags([...tags, tagInput.trim()]);
                          setTagInput("");
                        }
                      }}
                      disabled={!tagInput.trim()}
                    >
                      Add Tag
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-secondary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button onClick={generateImage} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Image with AI
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Or paste an image URL..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && fetchImageFromUrl()}
              />
              <Button onClick={fetchImageFromUrl} disabled={loading || !imageUrlInput.trim()} size="icon">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
              </Button>
            </div>

            <label className="block">
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </span>
              </Button>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {step === "image" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col items-center">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Avatar preview"
                    className="w-48 h-48 rounded-full object-cover mb-6"
                  />
                )}
                <div className="w-full space-y-4">
                  <div className="flex gap-4">
                    <Button onClick={generateImage} disabled={loading} variant="outline" className="flex-1">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Regenerate
                    </Button>
                    <label className="flex-1">
                      <Button variant="outline" className="w-full" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Change Image
                        </span>
                      </Button>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                  <Button onClick={saveAvatar} disabled={loading} className="w-full" size="lg">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Avatar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
        </div>
      </div>
    </SafeComponent>
  );
}