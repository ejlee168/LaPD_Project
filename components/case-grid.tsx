"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowUpDown, LuFilter } from "react-icons/lu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/case-card";
import { getAllAttempts, type GameAttempt } from "@/lib/attempts";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Game {
  id: string;
  title: string;
  author: string | null;
  created_at: string;
}

type Filter = "completed" | "failed" | "unseen";
const ALL_FILTERS: Filter[] = ["completed", "failed", "unseen"];
const FILTERS_KEY = "lapd-filters";

function isFilter(value: unknown): value is Filter {
  return value === "completed" || value === "failed" || value === "unseen";
}

type Sort = "date" | "author";
const SORT_KEY = "lapd-sort";

function isSort(value: unknown): value is Sort {
  return value === "date" || value === "author";
}

export function CaseGrid({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>(ALL_FILTERS);
  const [sort, setSort] = useState<Sort>("date");
  const [attempts, setAttempts] = useState<Record<string, GameAttempt>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawFilters = localStorage.getItem(FILTERS_KEY);
      if (rawFilters) {
        const parsed = JSON.parse(rawFilters);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isFilter);
          if (valid.length > 0) setFilters(valid);
        }
      }
      const rawSort = localStorage.getItem(SORT_KEY);
      if (rawSort && isSort(rawSort)) setSort(rawSort);
    } catch {
      // ignore malformed storage
    }
    setAttempts(getAllAttempts());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  }, [filters, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SORT_KEY, sort);
  }, [sort, hydrated]);

  function toggleFilter(f: Filter) {
    setFilters((prev) => {
      if (prev.includes(f)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== f);
      }
      return [...prev, f];
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = games.filter((g) => {
      const attempt = attempts[g.id];
      const category: Filter = !attempt
        ? "unseen"
        : attempt.result === "won"
          ? "completed"
          : "failed";
      if (!filters.includes(category)) return false;
      if (!q) return true;
      const date = new Date(g.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase();
      return g.title.toLowerCase().includes(q) || g.author?.toLowerCase().includes(q) || date.includes(q);
    });
    const sorted = [...result];
    if (sort === "date") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "author") {
      sorted.sort((a, b) => (a.author ?? "").localeCompare(b.author ?? ""));
    }
    return sorted;
  }, [games, query, filters, attempts, sort]);

  return (
    <>
      <div className="relative flex flex-col items-center gap-3 sm:block">
        <div className="flex flex-row max-w-md mx-auto items-center gap-5 w-full">
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
        <div className="flex flex-row gap-1 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="text-muted-foreground"
              render={<Button variant="ghost" size="icon" aria-label="Filter cases" />}
            >
              <LuFilter className="h-[1.2rem] w-[1.2rem]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={filters.includes("completed")}
                onCheckedChange={() => toggleFilter("completed")}
              >
                Completed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.includes("failed")}
                onCheckedChange={() => toggleFilter("failed")}
              >
                Failed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.includes("unseen")}
                onCheckedChange={() => toggleFilter("unseen")}
              >
                Unseen
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="text-muted-foreground"
              render={<Button variant="ghost" size="icon" aria-label="Sort cases" />}
            >
              <LuArrowUpDown className="h-[1.2rem] w-[1.2rem]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => { if (isSort(v)) setSort(v); }}>
                <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="author">Author</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
