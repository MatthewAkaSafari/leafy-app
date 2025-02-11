import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  "Vegetables",
  "Fruits",
  "Herbs",
  "Grains",
  "Dairy",
  "Meat",
];

interface SearchFiltersProps {
  onCategoryChange: (category: string | null) => void;
  onSearchChange: (search: string) => void;
  selectedCategory: string | null;
  searchTerm: string;
}

export default function SearchFilters({
  onCategoryChange,
  onSearchChange,
  selectedCategory,
  searchTerm,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select
        value={selectedCategory || "all"}
        onValueChange={(value) => onCategoryChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}