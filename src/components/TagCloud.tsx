import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tag, ChevronDown, ChevronUp, Sparkles, Brain, Lightbulb, Heart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tag categories with their associated tags
const TAG_CATEGORIES = {
  spirituality: {
    name: "Spirituality & Wisdom",
    icon: Sparkles,
    tags: ["enlightenment", "meditation", "dharma", "buddhism", "wisdom", "mindfulness", "advaita", "self-realization", "consciousness", "non-duality", "vedanta", "truth", "tantra", "awakening", "bhakti", "devotion", "mysticism", "silence", "presence", "surrender", "spiritual"]
  },
  philosophy: {
    name: "Philosophy & Thought",
    icon: Brain,
    tags: ["philosophy", "logic", "ethics", "reason", "awareness", "freedom", "inquiry", "conditioning", "idealism", "forms", "academy", "knowledge", "brahman"]
  },
  technology: {
    name: "Technology & Innovation",
    icon: Lightbulb,
    tags: ["technology", "innovation", "entrepreneurship", "space", "future", "mars", "social-media", "connection", "networking", "design", "simplicity", "perfectionism", "vision", "invention", "electricity", "energy", "science", "physics", "relativity", "genius", "imagination"]
  },
  personal: {
    name: "Personal Growth",
    icon: Heart,
    tags: ["transformation", "self-inquiry", "atma-vichara", "stillness", "joy", "fearlessness", "strength", "service", "youth", "practical-spirituality", "celebration", "rebellion", "discipline", "compassion", "equality", "social-reform", "unity"]
  },
  culture: {
    name: "Culture & Arts",
    icon: BookOpen,
    tags: ["poetry", "marathi", "sikhism", "hinduism", "divine-love", "goddess", "love", "beauty", "romance", "creativity", "passion", "governance", "peace", "dhamma", "leadership", "strategy", "politics", "pragmatism", "nationalism"]
  }
};

interface TagCloudProps {
  tags: string[];
  allAvatars: any[];
  selectedTags: string[];
  onTagClick: (tag: string) => void;
  onClearTags: () => void;
}

export default function TagCloud({
  tags,
  allAvatars,
  selectedTags,
  onTagClick,
  onClearTags,
}: TagCloudProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["spirituality"]));

  // Calculate tag frequency
  const tagFrequency = tags.reduce((acc, tag) => {
    const count = allAvatars.filter(
      (avatar) => avatar.tags && avatar.tags.includes(tag)
    ).length;
    acc[tag] = count;
    return acc;
  }, {} as Record<string, number>);

  // Organize tags by category
  const categorizedTags = Object.entries(TAG_CATEGORIES).map(([key, category]) => {
    const categoryTags = category.tags.filter(tag => tags.includes(tag));
    const sortedCategoryTags = categoryTags.sort((a, b) => tagFrequency[b] - tagFrequency[a]);
    return {
      key,
      ...category,
      tags: sortedCategoryTags,
      count: sortedCategoryTags.length
    };
  }).filter(cat => cat.count > 0);

  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  // Get size class based on frequency (mobile-first)
  const getSizeClass = (count: number) => {
    if (count >= 5) return "text-sm sm:text-base md:text-lg";
    if (count >= 3) return "text-xs sm:text-sm md:text-base";
    return "text-xs sm:text-sm";
  };

  const getOpacity = (count: number) => {
    if (count >= 5) return "opacity-100";
    if (count >= 3) return "opacity-80";
    return "opacity-60";
  };

  if (tags.length === 0) return null;

  return (
    <div className="mb-6 p-4 sm:p-6 bg-secondary/20 rounded-lg border border-border/50">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-3 sm:mb-4 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="text-base sm:text-lg font-semibold">Tag Categories</h3>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ({tags.length} tags)
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        )}
      </button>

      {/* Categories */}
      {!isCollapsed && (
        <div className="space-y-3 sm:space-y-4">
          {categorizedTags.map((category) => {
          const isExpanded = expandedCategories.has(category.key);
          const CategoryIcon = category.icon;

          return (
            <div key={category.key} className="border border-border/30 rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.key)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm sm:text-base font-medium">{category.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Category Tags */}
              {isExpanded && (
                <div className="p-3 sm:p-4 flex gap-1.5 sm:gap-2 flex-wrap">
                  {category.tags.map((tag) => {
                    const count = tagFrequency[tag];
                    const isSelected = selectedTags.includes(tag);

                    return (
                      <button
                        key={tag}
                        onClick={() => onTagClick(tag)}
                        className={`
                          px-2 py-1 sm:px-3 sm:py-1.5 
                          rounded-full font-medium transition-all duration-200
                          text-xs sm:text-sm
                          ${getOpacity(count)}
                          ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-lg scale-105"
                              : "bg-secondary/50 hover:bg-secondary hover:scale-105"
                          }
                        `}
                      >
                        <span>{tag}</span>
                        <span className="ml-1 text-[10px] sm:text-xs opacity-70">
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* Active Filters */}
      {selectedTags.length > 0 && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm text-muted-foreground">
              Active:
            </span>
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="cursor-pointer hover:bg-primary/80 text-xs"
                onClick={() => onTagClick(tag)}
              >
                {tag}
                <span className="ml-1">×</span>
              </Badge>
            ))}
            <button
              onClick={onClearTags}
              className="text-xs text-destructive hover:underline ml-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}