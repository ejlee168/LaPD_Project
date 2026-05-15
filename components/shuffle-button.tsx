"use client";

import { forwardRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LuShuffle } from "react-icons/lu";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAllAttempts } from "@/lib/attempts";
import { getShuffleFilters, type ShuffleFilter } from "@/lib/shuffle-filter";
import { getShuffleCategories } from "@/lib/shuffle-categories";

interface ShuffleButtonProps {
  label?: string;
  className?: string;
  variant?: "default" | "ghost" | "outline";
}

export const ShuffleButton = forwardRef<HTMLButtonElement, ShuffleButtonProps>(function ShuffleButton({ label, className, variant = "ghost" }, ref) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleShuffle() {
    const filters = getShuffleFilters();
    const selectedCategories = getShuffleCategories();
    const attempts = getAllAttempts();

    const promise = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("games")
        .select("id, diagnoses(categories(category))");
      if (!data || data.length === 0) throw new Error("No cases found");
      const currentId = pathname.startsWith("/play/") ? pathname.split("/")[2] : null;
      const withoutCurrent = currentId ? data.filter((g) => g.id !== currentId) : data;
      if (withoutCurrent.length === 0) throw new Error("No other cases available");

      const normalized = withoutCurrent.map((g) => {
        const diagnoses = g.diagnoses as unknown as
          | { categories: { category: string } | { category: string }[] | null }
          | { categories: { category: string } | { category: string }[] | null }[]
          | null;
        const diag = Array.isArray(diagnoses) ? diagnoses[0] : diagnoses;
        const cats = diag?.categories;
        const cat = Array.isArray(cats) ? cats[0] : cats;
        return { id: g.id, category: cat?.category ?? null };
      });

      const candidates = normalized.filter((g) => {
        const attempt = attempts[g.id];
        const status: ShuffleFilter = !attempt
          ? "unseen"
          : attempt.result === "won"
            ? "completed"
            : "failed";
        if (!filters.includes(status)) return false;
        if (g.category && !selectedCategories.includes(g.category)) return false;
        return true;
      });
      if (candidates.length === 0) throw new Error("No cases match your shuffle filter");

      const random = candidates[Math.floor(Math.random() * candidates.length)];
      await new Promise((r) => setTimeout(r, 200));
      router.push(`/play/${random.id}`);
    };

    toast.promise(promise(), {
      loading: "Shuffling...",
      success: "Here's a random case!",
      error: (err) => (err instanceof Error ? err.message : "Failed to load cases"),
      duration: 1500,
    });
  }

  return (
    <Button
      ref={ref}
      variant={variant}
      onClick={handleShuffle}
      className={cn(variant === "ghost" && "text-muted-foreground", className)}
      aria-label="Random case"
    >
      <LuShuffle className="h-4 w-4" />
      {label}
    </Button>
  );
});
