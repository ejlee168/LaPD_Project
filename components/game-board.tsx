"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { DiagnosisCombobox } from "@/components/diagnosis-combobox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import type { Game, Diagnosis } from "@/lib/types";

interface GameBoardProps {
  game: Game;
  diagnoses: Diagnosis[];
  answerName: string;
}

export function GameBoard({ game, diagnoses, answerName }: GameBoardProps) {
  const [revealedCount, setRevealedCount] = useState(1);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");

  const totalClues = game.clues.length;
  const guessesRemaining = totalClues - revealedCount;

  function handleGuess() {
    if (!selectedDiagnosis) {
      toast.error("Select a diagnosis first");
      return;
    }
    if (selectedDiagnosis === game.answer_id) {
      setGameState("won");
      return;
    }
    toast.error("Wrong diagnosis!");
    setSelectedDiagnosis("");
    revealNextClue();
  }

  function handleSkip() {
    setSelectedDiagnosis("");
    revealNextClue();
  }

  function revealNextClue() {
    if (revealedCount >= totalClues) {
      setGameState("lost");
      return;
    }
    setRevealedCount((prev) => {
      const next = prev + 1;
      if (next >= totalClues) {
        setGameState("lost");
      }
      return next;
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{game.title}</h1>
        <p className="text-sm text-muted-foreground">Clue {revealedCount} of {totalClues}</p>
      </div>

      <div className="space-y-3">
        {game.clues.map((clue, index) => (
          <div
            key={index}
            className={cn(
              "rounded-lg border p-4 transition-all",
              index < revealedCount
                ? "border-l-4 border-l-green-500 bg-card"
                : "bg-muted/30 border-muted"
            )}
          >
            {index < revealedCount ? (
              <>
                {clue.label && <p className="text-xs text-muted-foreground mb-1">{clue.label}</p>}
                <p className="text-sm">{clue.text}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Clue {index + 1} — locked</p>
            )}
          </div>
        ))}
      </div>

      {gameState === "playing" && (
        <div className="space-y-3">
          <DiagnosisCombobox diagnoses={diagnoses} value={selectedDiagnosis} onSelect={setSelectedDiagnosis} />
          <div className="flex gap-2">
            <Button onClick={handleGuess} className="flex-1">Guess</Button>
            <Button variant="outline" onClick={handleSkip}>Skip</Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {guessesRemaining} guess{guessesRemaining !== 1 ? "es" : ""} remaining
          </p>
        </div>
      )}

      <Dialog open={gameState === "won"} onOpenChange={() => {}}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">🎉 Correct!</DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-green-500">{answerName}</p>
                <p className="text-muted-foreground">Solved with {revealedCount} clue{revealedCount !== 1 ? "s" : ""}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Link href="/">
            <Button className="w-full">Back to Levels</Button>
          </Link>
        </DialogContent>
      </Dialog>

      <Dialog open={gameState === "lost"} onOpenChange={() => {}}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">📋 Game Over</DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-red-500">Answer: {answerName}</p>
                <p className="text-muted-foreground">All {totalClues} clues revealed</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Link href="/">
            <Button className="w-full">Back to Levels</Button>
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}
