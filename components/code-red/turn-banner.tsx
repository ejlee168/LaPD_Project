"use client";

import { cn } from "@/lib/utils";
import type { CrGame, CrCard } from "@/lib/code-red/types";

interface Props {
  game: CrGame | null;
  cards: CrCard[];
}

export function TurnBanner({ game, cards }: Props) {
  if (!game) return null;

  const redTotal = game.starting_team === "red" ? 9 : 8;
  const blueTotal = game.starting_team === "blue" ? 9 : 8;
  const redRevealed = cards.filter((c) => c.card_type === "red" && c.revealed).length;
  const blueRevealed = cards.filter((c) => c.card_type === "blue" && c.revealed).length;

  const TeamScore = ({ team, revealed, total }: { team: "red" | "blue"; revealed: number; total: number }) => (
    <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
      <span
        className={cn(
          "inline-block size-3 rounded-full",
          team === "red" ? "bg-red-500" : "bg-blue-500",
        )}
      />
      <span className={team === "red" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}>
        {revealed}/{total}
      </span>
    </div>
  );

  if (game.status !== "in_progress") {
    const winner = game.status === "red_win" ? "Red" : "Blue";
    return (
      <div className="rounded-lg border px-4 py-2 flex items-center justify-between gap-3">
        <TeamScore team="red" revealed={redRevealed} total={redTotal} />
        <p className="text-base font-semibold text-center flex-1">{winner} team wins!</p>
        <TeamScore team="blue" revealed={blueRevealed} total={blueTotal} />
      </div>
    );
  }

  const accent = game.current_team === "red"
    ? "bg-red-500/10 border-red-500/40"
    : "bg-blue-500/10 border-blue-500/40";

  return (
    <div className={cn("rounded-lg border px-4 py-2 flex items-center justify-between gap-3", accent)}>
      <TeamScore team="red" revealed={redRevealed} total={redTotal} />
      <div className="flex-1 text-center space-y-0.5">
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
      <TeamScore team="blue" revealed={blueRevealed} total={blueTotal} />
    </div>
  );
}
