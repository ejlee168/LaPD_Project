"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowUpDown, LuFilter, LuLayers } from "react-icons/lu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/case-card";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
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
  category: string | null;
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

const GROUP_KEY = "lapd-group-by-category";
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

export function CaseGrid({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>(ALL_FILTERS);
  const [sort, setSort] = useState<Sort>("date");
  const [groupByCategory, setGroupByCategory] = useState(false);
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
      const rawGroup = localStorage.getItem(GROUP_KEY);
      if (rawGroup === "true") setGroupByCategory(true);
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

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(GROUP_KEY, String(groupByCategory));
  }, [groupByCategory, hydrated]);

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
      return g.title.toLowerCase().includes(q) || g.author?.toLowerCase().includes(q) || date.includes(q) || g.category?.toLowerCase().includes(q);
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Group cases by category"
            aria-pressed={groupByCategory}
            onClick={() => setGroupByCategory((v) => !v)}
            className={cn(groupByCategory ? "text-foreground" : "text-muted-foreground")}
          >
            <LuLayers className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </div>
      </div>
      {groupByCategory ? (
        <GroupedGrid games={filtered} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((game, index) => (
            <CaseCard
              key={game.id}
              id={game.id}
              title={game.title}
              author={game.author}
              createdAt={game.created_at}
              category={game.category}
              index={index}
            />
          ))}
        </div>
      )}
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground">No cases found. Be the first to create one!</p>
      )}
    </>
  );
}

function GroupedGrid({ games }: { games: Game[] }) {
  const groups = useMemo(() => {
    const byCategory = new Map<string, Game[]>();
    for (const g of games) {
      const key = g.category ?? "Uncategorized";
      const list = byCategory.get(key);
      if (list) list.push(g);
      else byCategory.set(key, [g]);
    }
    const ordered: { category: string; games: Game[] }[] = [];
    for (const name of CATEGORY_ORDER) {
      const list = byCategory.get(name);
      if (list && list.length) ordered.push({ category: name, games: list });
    }
    const uncat = byCategory.get("Uncategorized");
    if (uncat && uncat.length) ordered.push({ category: "Uncategorized", games: uncat });
    return ordered;
  }, [games]);

  let runningIndex = 0;
  return (
    <div className="space-y-8">
      {groups.map(({ category, games: groupGames }) => {
        const meta = CATEGORY_META[category];
        const start = runningIndex;
        runningIndex += groupGames.length;
        return (
          <section key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              {meta && <meta.Icon aria-hidden className={cn("size-4", meta.color)} />}
              <span>{category}</span>
              <span className="text-xs font-normal opacity-60">{groupGames.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupGames.map((game, i) => (
                <CaseCard
                  key={game.id}
                  id={game.id}
                  title={game.title}
                  author={game.author}
                  createdAt={game.created_at}
                  category={game.category}
                  index={start + i}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
