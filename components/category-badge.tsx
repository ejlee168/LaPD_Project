"use client";

import { CATEGORY_META } from "@/lib/categories";
import { useShowCategories } from "@/lib/show-categories";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: string | null | undefined;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const show = useShowCategories();
  if (!show) return null;
  if (!category) return null;
  const meta = CATEGORY_META[category];
  if (!meta) return null;

  return (
    <meta.Icon
      title={category}
      aria-label={category}
      className={cn("size-4 shrink-0", meta.color, className)}
    />
  );
}
