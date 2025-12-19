import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, LogIn, LogOut, Shield, MessageSquare, CreditCard, Star, Tag } from "lucide-react";
import { toast } from "sonner";
import AvatarEditor from "./AvatarEditor";
import AvatarFilters from "./AvatarFilters";
import TagCloud from "./TagCloud";
import CreditsBalance from "./CreditsBalance";
import einsteinImg from "@/assets/avatars/einstein.jpg";
import ramanaImg from "@/assets/avatars/ramana.jpg";
import buddhaImg from "@/assets/avatars/buddha.jpg";
import nanakImg from "@/assets/avatars/nanak.jpg";
import nisargadattaImg from "@/assets/avatars/nisargadatta.jpg";
import ramtirthaImg from "@/assets/avatars/ramtirtha.jpg";
import dnyaneshwarImg from "@/assets/avatars/dnyaneshwar.jpg";
import ramakrishnaImg from "@/assets/avatars/ramakrishna.jpg";
import teslaImg from "@/assets/avatars/tesla.jpg";
import jungImg from "@/assets/avatars/jung.jpg";
import muskImg from "@/assets/avatars/musk.jpg";
import jobsImg from "@/assets/avatars/jobs.jpg";
import zuckerbergImg from "@/assets/avatars/zuckerberg.jpg";
import krishnamurtiImg from "@/assets/avatars/krishnamurti.jpg";
import logo from "@/assets/logo.png";

interface Avatar {
  id: string;
  name: string;
  title: string;
  description: string | null;
  category: string;
  image_url?: string | null;
  is_custom?: boolean;
  tags?: string[];
  is_favorited?: boolean;
}

type CategoryFilter = "all" | "sage" | "scientist" | "creator" | "custom";

const categoryConfig = {
  sage: { label: "🕉️ Sages", variant: "default" as const },
  scientist: { label: "🧠 Scientists", variant: "secondary" as const },
  creator: { label: "💡 Creators", variant: "outline" as const },
  custom: { label: "✨ Private", variant: "default" as const },
};

const avatarImages: Record<string, string> = {
  "Albert Einstein": einsteinImg,
  "Ramana Maharshi": ramanaImg,
  "Buddha": buddhaImg,
  "Guru Nanak": nanakImg,
  "Nisargadatta Maharaj": nisargadattaImg,
  "Swami Ram Tirtha": ramtirthaImg,
  "Saint Dnyaneshwar": dnyaneshwarImg,
  "Ramakrishna Paramhansa": ramakrishnaImg,
  "Nikola Tesla": teslaImg,
  "Carl Jung": jungImg,
  "Elon Musk": muskImg,
  "Steve Jobs": jobsImg,
  "Mark Zuckerberg": zuckerbergImg,
  "J Krishnamurti": krishnamurtiImg,
};

export default function AvatarGrid() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [selectedStrength, setSelectedStrength] = useState("all");
  const [availableStrengths, setAvailableStrengths] = useState<string[]>([]);
  const [editingAvatar, setEditingAvatar] = useState<Avatar | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAvatars();
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const loadAvatars = async () => {
    try {
      console.log("Loading avatars...");
      
      // Load default avatars
      const { data: defaultAvatars, error: defaultError } = await supabase
        .from("avatars")
        .select("id, name, title, description, category, image_url, tags")
        .order("name");
      
      console.log("Default avatars loaded:", defaultAvatars?.length || 0, defaultError);
      
      if (defaultError) {
        console.error("Error loading default avatars:", defaultError);
      }
      
      // Load custom user avatars - handle gracefully if fails due to auth
      const { data: userAvatars, error: userError } = await supabase
        .from("user_avatars")
        .select("id, name, title, description, category, image_url, user_id, tags")
        .order("created_at", { ascending: false });
      
      console.log("User avatars loaded:", userAvatars?.length || 0, userError);
      
      if (userError) {
        console.warn("Could not load user avatars (may require auth):", userError);
      }

      // Load favorites if user is authenticated
      let userFavorites = new Set<string>();
      if (user) {
        const { data: favData } = await supabase
          .from("user_favorite_avatars")
          .select("avatar_id, avatar_type");
        
        if (favData) {
          favData.forEach(fav => {
            userFavorites.add(`${fav.avatar_id}-${fav.avatar_type}`);
          });
        }
      }
      setFavorites(userFavorites);
      
      // Combine avatars - use what we got even if one query failed
      const combined = [
        ...(defaultAvatars || []).map(a => ({
          ...a,
          is_favorited: userFavorites.has(`${a.id}-default`)
        })),
        ...(userAvatars || []).map(a => ({ 
          ...a, 
          is_custom: true,
          is_favorited: userFavorites.has(`${a.id}-custom`)
        }))
      ];
      
      console.log("Total avatars combined:", combined.length);
      setAvatars(combined);

      // Extract unique strengths
      const strengths = new Set<string>();
      combined.forEach((av: any) => {
        if (av.strength) strengths.add(av.strength);
      });
      setAvailableStrengths(Array.from(strengths).sort());

      // Extract unique tags from all avatars (default + custom)
      const tags = new Set<string>();
      combined.forEach((av: any) => {
        if (av.tags && Array.isArray(av.tags)) {
          av.tags.forEach((tag: string) => tags.add(tag));
        }
      });
      setAvailableTags(Array.from(tags).sort());
    } catch (error) {
      console.error("Unexpected error loading avatars:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (avatarId: string, isCustom: boolean) => {
    if (!user) {
      toast.error("Please sign in to favorite avatars");
      return;
    }

    const avatarType = isCustom ? "custom" : "default";
    const favKey = `${avatarId}-${avatarType}`;
    const isFavorited = favorites.has(favKey);

    try {
      if (isFavorited) {
        await supabase
          .from("user_favorite_avatars")
          .delete()
          .eq("user_id", user.id)
          .eq("avatar_id", avatarId)
          .eq("avatar_type", avatarType);
        
        const newFavorites = new Set(favorites);
        newFavorites.delete(favKey);
        setFavorites(newFavorites);
        
        setAvatars(avatars.map(a => 
          a.id === avatarId ? { ...a, is_favorited: false } : a
        ));
      } else {
        await supabase
          .from("user_favorite_avatars")
          .insert({
            user_id: user.id,
            avatar_id: avatarId,
            avatar_type: avatarType
          });
        
        const newFavorites = new Set(favorites);
        newFavorites.add(favKey);
        setFavorites(newFavorites);
        
        setAvatars(avatars.map(a => 
          a.id === avatarId ? { ...a, is_favorited: true } : a
        ));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const filteredAvatars = avatars.filter(avatar => {
    // Favorites filter
    if (showFavorites && !avatar.is_favorited) return false;

    // Category filter
    let matchesCategory = false;
    if (selectedCategory === "all") {
      matchesCategory = true;
    } else if (selectedCategory === "custom") {
      matchesCategory = avatar.is_custom === true;
    } else {
      matchesCategory = !avatar.is_custom && avatar.category === selectedCategory;
    }

    // Strength filter
    const matchesStrength = selectedStrength === "all" || (avatar as any).strength === selectedStrength;
    
    // Tags filter
    const matchesTags = selectedTags.length === 0 || 
      (avatar.tags && selectedTags.some(tag => avatar.tags?.includes(tag)));
    
    // Search filter
    const matchesSearch = !searchQuery || 
      avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avatar.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avatar.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avatar.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesStrength && matchesTags && matchesSearch;
  }).sort((a, b) => {
    // Sort favorites first
    if (a.is_favorited && !b.is_favorited) return -1;
    if (!a.is_favorited && b.is_favorited) return 1;
    return 0;
  });

  // Calculate category counts
  const categoryCounts = {
    all: avatars.length,
    sage: avatars.filter(a => !a.is_custom && a.category === 'sage').length,
    scientist: avatars.filter(a => !a.is_custom && a.category === 'scientist').length,
    creator: avatars.filter(a => !a.is_custom && a.category === 'creator').length,
    custom: avatars.filter(a => a.is_custom).length,
  };

  const handleAvatarClick = async (avatarId: string, isCustom?: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      // Create new chat session with authenticated user_id
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ 
          avatar_id: avatarId,
          user_id: user.id
        })
        .select()
        .single();

      if (!error && data) {
        navigate(`/chat/${data.id}`);
      }
    } catch (error) {
      console.error("Error creating chat session:", error);
    }
  };

  const getAvatarImage = (avatar: Avatar) => {
    if (avatar.image_url) return avatar.image_url;
    return avatarImages[avatar.name] || avatarImages["Buddha"];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Skeleton className="h-12 w-64 mx-auto mb-2" />
          <Skeleton className="h-6 w-96 mx-auto mb-12" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(14)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Fixed and Optimized */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={logo} alt="SageMitra" className="h-10 w-10 sm:h-12 sm:w-12" />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  SageMitra
                </h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block">Chat with legendary minds</p>
              </div>
            </div>
            
            {/* Actions - Compact */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CreditsBalance />
              <Button 
                onClick={() => navigate('/feedback')} 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
              >
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline ml-1.5 text-xs">Feedback</span>
              </Button>
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/admin')} 
                  variant="ghost" 
                  size="sm"
                  className="hidden lg:flex h-9 px-3"
                >
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  <span className="text-xs">Admin</span>
                </Button>
              )}
              {user ? (
                <Button 
                  onClick={() => signOut()} 
                  variant="outline" 
                  size="sm"
                  className="h-8 sm:h-9 text-xs"
                >
                  <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/auth')} 
                  size="sm"
                  className="h-8 sm:h-9 text-xs"
                >
                  <LogIn className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Search and Create - Compact */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Input
              placeholder="Search avatars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-10 text-sm"
            />
            <Button 
              onClick={() => navigate('/create-avatar')} 
              size="default"
              className="h-10 w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Avatar
            </Button>
          </div>

          {/* Category Pills - Compact and scrollable */}
          <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1.5 sm:gap-2 min-w-max pb-1">
              <button
                onClick={() => {
                  setShowFavorites(!showFavorites);
                  setSelectedCategory("all");
                }}
                className={`
                  px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${showFavorites
                    ? "bg-amber-500 text-white shadow-md scale-105"
                    : "bg-card hover:bg-secondary/80 border border-border/50"
                  }
                `}
              >
                <Star className={`w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1 ${showFavorites ? "fill-current" : ""}`} />
                Favorites
              </button>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`
                  px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${selectedCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-card hover:bg-secondary/80 border border-border/50"
                  }
                `}
              >
                All ({categoryCounts.all})
              </button>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as CategoryFilter)}
                  className={`
                    px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${selectedCategory === key
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-card hover:bg-secondary/80 border border-border/50"
                    }
                  `}
                >
                  {config.label} ({categoryCounts[key as keyof typeof categoryCounts]})
                </button>
              ))}
            </div>
          </div>

        {/* Tag Cloud */}
        <TagCloud
          tags={availableTags}
          allAvatars={avatars}
          selectedTags={selectedTags}
          onTagClick={(tag) => {
            if (selectedTags.includes(tag)) {
              setSelectedTags(selectedTags.filter(t => t !== tag));
            } else {
              setSelectedTags([...selectedTags, tag]);
            }
          }}
          onClearTags={() => setSelectedTags([])}
        />

          {/* Avatar Grid - Optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up">
            {filteredAvatars.map((avatar, index) => (
              <Card
                key={avatar.id}
                style={{ animationDelay: `${index * 30}ms` }}
                className="group overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border border-border/50 hover:border-primary/40 relative bg-card/80 backdrop-blur-sm animate-scale-in"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => handleAvatarClick(avatar.id, avatar.is_custom)}
                >
                  {/* Avatar Image - Compact */}
                  <div className="aspect-square relative overflow-hidden p-3 sm:p-4">
                    <div className="avatar-card-halo relative w-full h-full rounded-full overflow-hidden transition-all duration-200">
                      <img
                        src={getAvatarImage(avatar)}
                        alt={avatar.name}
                        loading="lazy"
                        className="avatar-image"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    
                    {/* Favorite Badge */}
                    {avatar.is_favorited && (
                      <div className="absolute top-4 right-4 bg-amber-500 rounded-full p-1 shadow-md">
                        <Star className="w-2.5 h-2.5 text-white fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Content - Compact */}
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm line-clamp-1 flex-1 group-hover:text-primary transition-colors">
                        {avatar.name}
                      </h3>
                      <Badge 
                        variant={categoryConfig[avatar.category as keyof typeof categoryConfig]?.variant || "default"} 
                        className="text-[10px] px-1.5 py-0.5 shrink-0 hidden sm:inline-flex"
                      >
                        {avatar.is_custom ? "✨" : avatar.category === "sage" ? "🕉️" : avatar.category === "scientist" ? "🧠" : "💡"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {avatar.title}
                    </p>
                    
                    {/* Tags - Compact horizontal scroll */}
                    {avatar.tags && avatar.tags.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto scrollbar-hide pt-0.5">
                        {avatar.tags.slice(0, 3).map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="text-[10px] bg-secondary/60 px-1.5 py-0.5 rounded whitespace-nowrap"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons - Top right corner */}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 shadow-md backdrop-blur-sm bg-background/95 hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(avatar.id, avatar.is_custom || false);
                    }}
                  >
                    <Star className={`w-3.5 h-3.5 transition-colors ${avatar.is_favorited ? "fill-amber-500 text-amber-500" : ""}`} />
                  </Button>
                  {(isAdmin || avatar.is_custom) && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 shadow-md backdrop-blur-sm bg-background/95 hover:bg-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAvatar(avatar);
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredAvatars.length === 0 && (
            <div className="text-center py-16 sm:py-24 animate-fade-in">
              <p className="text-lg text-muted-foreground mb-2">No avatars found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>

        {/* Avatar Editor Dialog */}
        {editingAvatar && (
          <AvatarEditor
            avatar={editingAvatar}
            open={!!editingAvatar}
            onOpenChange={(open) => !open && setEditingAvatar(null)}
            onSaved={loadAvatars}
          />
        )}
      </div>
    </div>
  );
}
