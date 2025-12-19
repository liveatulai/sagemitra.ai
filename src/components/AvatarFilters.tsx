import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface AvatarFiltersProps {
  selectedCategory: string;
  selectedStrength: string;
  onCategoryChange: (category: string) => void;
  onStrengthChange: (strength: string) => void;
  availableStrengths: string[];
}

export default function AvatarFilters({
  selectedCategory,
  selectedStrength,
  onCategoryChange,
  onStrengthChange,
  availableStrengths
}: AvatarFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="sage">Sage</SelectItem>
          <SelectItem value="innovator">Innovator</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      <Select value={selectedStrength} onValueChange={onStrengthChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Strengths" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Strengths</SelectItem>
          {availableStrengths.map((strength) => (
            <SelectItem key={strength} value={strength}>
              {strength}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(selectedCategory !== "all" || selectedStrength !== "all") && (
        <div className="flex gap-2 flex-wrap">
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => onCategoryChange("all")}>
              {selectedCategory} <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {selectedStrength !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => onStrengthChange("all")}>
              {selectedStrength} <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
