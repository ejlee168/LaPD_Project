"use client";

import { useRouter, usePathname } from "next/navigation";
import { LuShuffle } from "react-icons/lu";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ShuffleButton() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleShuffle() {
    const promise = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("games").select("id");
      if (!data || data.length === 0) throw new Error("No cases found");
      const currentId = pathname.startsWith("/play/") ? pathname.split("/")[2] : null;
      const candidates = currentId ? data.filter((g) => g.id !== currentId) : data;
      if (candidates.length === 0) throw new Error("No other cases available");
      const random = candidates[Math.floor(Math.random() * candidates.length)];
      router.push(`/play/${random.id}`);
    };

    toast.promise(promise(), {
      loading: "Shuffling...",
      success: "Here's a random case!",
      error: "Failed to load cases",
      duration: 1000,
    });
  }

  return (
    <Button
      variant="ghost"
      onClick={handleShuffle}
      className="text-muted-foreground"
      aria-label="Random case"
    >
      <LuShuffle className="h-4 w-4" />
    </Button>
  );
}
