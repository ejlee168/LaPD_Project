"use client";

import type { CrAction } from "@/lib/code-red/types";

interface Props {
  actions: CrAction[];
  nicknameByPlayerId: Record<string, string | undefined>;
}

function describe(a: CrAction, who?: string): string {
  const w = who ?? "Someone";
  switch (a.action_type) {
    case "clue": {
      const p = a.payload as { word?: string; count?: number } | null;
      return `${w} gave clue "${p?.word}" (${p?.count})`;
    }
    case "reveal": {
      const p = a.payload as { position?: number; card_type?: string } | null;
      return `${w} revealed #${(p?.position ?? 0) + 1} → ${p?.card_type}`;
    }
    case "end_turn":
      return `${w} ended the turn`;
    case "game_end": {
      const p = a.payload as { winner?: string; reason?: string } | null;
      return `Game over — ${p?.winner} wins (${p?.reason})`;
    }
  }
}

export function ActionLog({ actions, nicknameByPlayerId }: Props) {
  if (actions.length === 0) return null;
  return (
    <div className="rounded-lg border px-4 py-2 max-h-48 overflow-y-auto">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Log</p>
      <ul className="space-y-0.5 text-xs font-mono">
        {actions.map((a) => (
          <li key={a.id}>
            {describe(a, a.player_id ? nicknameByPlayerId[a.player_id] : undefined)}
          </li>
        ))}
      </ul>
    </div>
  );
}
