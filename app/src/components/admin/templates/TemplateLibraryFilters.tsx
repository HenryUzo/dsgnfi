import { Search } from "lucide-react";

import type { TemplateCategory } from "../../../services/adminSites";
import {
  templateCategories,
  type TemplateTypeFilter,
  formatTemplateCategory,
} from "./templatePresentation";

type TemplateLibraryFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  category: "all" | TemplateCategory;
  onCategoryChange: (value: "all" | TemplateCategory) => void;
  type: TemplateTypeFilter;
  onTypeChange: (value: TemplateTypeFilter) => void;
};

export function TemplateLibraryFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  type,
  onTypeChange,
}: TemplateLibraryFiltersProps) {
  return (
    <section className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/70">
        <Search className="h-4 w-4 text-white/38" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search templates by name, category, or module..."
          className="w-full bg-transparent text-white outline-none placeholder:text-white/36"
        />
      </label>
      <select
        value={category}
        onChange={(event) =>
          onCategoryChange(event.target.value as "all" | TemplateCategory)
        }
        className="cursor-pointer rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/72 outline-none"
      >
        {templateCategories.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All categories" : formatTemplateCategory(option)}
          </option>
        ))}
      </select>
      <select
        value={type}
        onChange={(event) => onTypeChange(event.target.value as TemplateTypeFilter)}
        className="cursor-pointer rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/72 outline-none"
      >
        <option value="all">All types</option>
        <option value="starter">Starter</option>
        <option value="custom">Custom</option>
      </select>
    </section>
  );
}
