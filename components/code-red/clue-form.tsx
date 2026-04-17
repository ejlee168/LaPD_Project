"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitClue, endTurn } from "@/lib/code-red/client";
import { isYourTurnToClue, isYourTurnToGuess } from "@/lib/code-red/rules";
import type { CrGame, CrPlayer } from "@/lib/code-red/types";

interface Props {
  code: string;
  token: string;
  me: CrPlayer | null;
  game: CrGame | null;
}

export function ClueForm({ code, token, me, game }: Props) {
  const [word, setWord] = useState("");
  const [count, setCount] = useState("1");
  const canClue = isYourTurnToClue(game, me);
  const canEndTurn = isYourTurnToGuess(game, me);

  async function handleSubmit() {
    const w = word.trim();
    const n = parseInt(count, 10);
    if (!w) return toast.error("Enter a clue word");
    if (!Number.isFinite(n) || n < 1) return toast.error("Count must be >= 1");
    try {
      await submitClue(code, token, w, n);
      setWord("");
      setCount("1");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleEnd() {
    try { await endTurn(code, token); }
    catch (e) { toast.error((e as Error).message); }
  }

  if (canClue) {
    return (
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Clue word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          maxLength={40}
        />
        <Input
          className="w-20"
          type="number"
          min={1}
          max={25}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
        <Button onClick={handleSubmit}>Send clue</Button>
      </div>
    );
  }

  if (canEndTurn) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleEnd}>End turn</Button>
      </div>
    );
  }

  return null;
}
