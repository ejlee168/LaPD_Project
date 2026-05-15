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
    <span
      title={category}
      aria-label={category}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-sm leading-none",
        meta.bg,
        className,
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
    </span>
  );
}
