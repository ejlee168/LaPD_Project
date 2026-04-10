"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/case-card";

interface Game {
  id: string;
  title: string;
  author: string | null;
  created_at: string;
}

export function CaseGrid({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return games;
    const q = query.toLowerCase();
    return games.filter((g) => {
      const date = new Date(g.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase();
      return g.title.toLowerCase().includes(q) || g.author?.toLowerCase().includes(q) || date.includes(q);
    });
  }, [games, query]);

  return (
    <>
      <div className="flex flex-row max-w-md mx-auto items-center gap-5">
        <Input
          placeholder="search cases..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p>or</p>
        <div className="text-center">
          <Link tabIndex={-1} href="/editor">
            <Button className="py-4"><span className="pl-0.5">+</span>create a case</Button>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((game, index) => (
          <CaseCard
            key={game.id}
            id={game.id}
            title={game.title}
            author={game.author}
            createdAt={game.created_at}
            index={index}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground">No cases found. Be the first to create one!</p>
      )}
    </>
  );
}
