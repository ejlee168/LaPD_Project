"use client";

import { toast } from "sonner";
import { GameCard } from "@/components/code-red/game-card";
import { revealCard } from "@/lib/code-red/client";
import { isYourTurnToGuess } from "@/lib/code-red/rules";
import type { CrCard, CrGame, CrPlayer } from "@/lib/code-red/types";

interface Props {
  code: string;
  token: string;
  me: CrPlayer | null;
  game: CrGame | null;
  cards: CrCard[];
}

export function GameBoard({ code, token, me, game, cards }: Props) {
  const spymasterView = !!me?.is_spymaster;
  const canGuess = isYourTurnToGuess(game, me);

  async function click(position: number) {
    try { await revealCard(code, token, position); }
    catch (e) { toast.error((e as Error).message); }
  }

  const sorted = [...cards].sort((a, b) => a.position - b.position);

  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      {sorted.map((c) => (
        <GameCard
          key={c.id}
          card={c}
          spymasterView={spymasterView}
          canClick={canGuess}
          onClick={() => click(c.position)}
        />
      ))}
    </div>
  );
}
