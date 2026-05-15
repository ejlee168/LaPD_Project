"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategoryBadge } from "@/components/category-badge";
import { FaCheck, FaXmark } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { getAttempt, type GameAttempt } from "@/lib/attempts";

interface CaseCardProps {
  id: string;
  title: string;
  author?: string | null;
  createdAt: string;
  category?: string | null;
  index?: number;
}

export function CaseCard({ id, title, author, createdAt, category, index = 0 }: CaseCardProps) {
  const [attempt, setAttempt] = useState<GameAttempt | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAttempt(getAttempt(id));
    setMounted(true);

    function onStorage(e: StorageEvent) {
      if (e.key === "lapd-attempts") setAttempt(getAttempt(id));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [id]);

  const won = mounted && attempt?.result === "won";
  const lost = mounted && attempt?.result === "lost";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.6) }}
    >
      <Link href={`/play/${id}`} className="group block rounded-xl">
        <Card
          className={cn(
            "relative transition-shadow transition-transform duration-200 cursor-pointer hover:shadow-md active:scale-[0.98]",
            won && "border-green-500/50 bg-green-500/5",
            lost && "border-red-500/50 bg-red-500/5",
            !won && !lost && "hover:border-foreground/20",
          )}
        >
          {mounted && attempt && (
            <div
              className={cn(
                "absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                won && "bg-green-500/10 text-green-600 dark:text-green-400",
                lost && "bg-red-500/10 text-red-600 dark:text-red-400",
              )}
            >
              {won ? <FaCheck className="h-3 w-3" /> : <FaXmark className="h-3 w-3" />}
              {won && `${attempt.cluesUsed} clue${attempt.cluesUsed !== 1 ? "s" : ""}`}
            </div>
          )}
          <CategoryBadge category={category} className="absolute bottom-2 right-2" />
          <CardHeader className="pr-12">
            <CardTitle className="marquee-clip text-base">
              <span className="marquee-track">{title}</span>
            </CardTitle>
            <CardDescription>
              {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {author && ` | ${author}`}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </motion.div>
  );
}
