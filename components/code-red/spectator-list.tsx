"use client";

import { cn } from "@/lib/utils";
import type { CrPlayer } from "@/lib/code-red/types";

interface Props {
  players: CrPlayer[];
  online: Set<string>;
  me: CrPlayer | null;
}

export function SpectatorList({ players, online, me }: Props) {
  const spectators = players.filter((p) => p.team === null);
  if (spectators.length === 0) return null;
  return (
    <div className="rounded-lg border px-4 py-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
        Spectators ({spectators.length})
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {spectators.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span className={cn(
              "inline-block size-2 rounded-full",
              online.has(p.player_token) ? "bg-emerald-500" : "bg-muted-foreground/40",
            )} />
            <span>{p.nickname}</span>
            {p.id === me?.id && (
              <span className="text-xs text-muted-foreground">(you)</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
