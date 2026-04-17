"use client";

import { cn } from "@/lib/utils";
import type { CrGame } from "@/lib/code-red/types";

export function TurnBanner({ game }: { game: CrGame | null }) {
  if (!game) return null;

  if (game.status !== "in_progress") {
    const winner = game.status === "red_win" ? "Red" : "Blue";
    return (
      <div className="rounded-lg border px-4 py-2 text-center text-base font-semibold">
        {winner} team wins!
      </div>
    );
  }

  const accent = game.current_team === "red"
    ? "bg-red-500/10 border-red-500/40"
    : "bg-blue-500/10 border-blue-500/40";

  return (
    <div className={cn("rounded-lg border px-4 py-2 text-center space-y-0.5", accent)}>
      <p className="text-sm font-medium">
        <span className="capitalize">{game.current_team}</span> team&apos;s turn
      </p>
      {game.current_clue_word ? (
        <p className="text-xs text-muted-foreground">
          Clue: <span className="font-mono font-semibold">{game.current_clue_word}</span>
          {" · "}
          {game.current_clue_count} · guesses left: {game.guesses_remaining}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Waiting for spymaster clue</p>
      )}
    </div>
  );
}
