"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { DiagnosisCombobox } from "@/components/diagnosis-combobox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import type { Game, Diagnosis } from "@/lib/types";
import { getHaptics } from "@/lib/haptics";
import { saveAttempt } from "@/lib/attempts";

interface GameBoardProps {
  game: Game;
  diagnoses: Diagnosis[];
  answerName: string;
}

interface GuessEntry {
  type: "wrong" | "skip";
  diagnosisId?: string;
  name?: string;
  clueNumber: number;
}

export function GameBoard({ game, diagnoses, answerName }: GameBoardProps) {
  const [revealedCount, setRevealedCount] = useState(1);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [dialogOpen, setDialogOpen] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [guessHistory, setGuessHistory] = useState<GuessEntry[]>([]);

  const totalClues = game.clues.length;
  const guessesRemaining = totalClues - revealedCount;
  const disabledIds = new Set(guessHistory.filter((g) => g.diagnosisId).map((g) => g.diagnosisId!));

  const allRevealed = revealedCount >= totalClues;

  function handleGuess() {
    if (!selectedDiagnosis) {
      toast.error("Select a diagnosis first");
      return;
    }
    if (selectedDiagnosis === game.answer_id) {
      getHaptics().trigger("success");
      saveAttempt(game.id, "won", revealedCount);
      setGameState("won");
      return;
    }
    const name = diagnoses.find((d) => d.id === selectedDiagnosis)?.name ?? "";
    setGuessHistory((prev) => [...prev, { type: "wrong", diagnosisId: selectedDiagnosis, name, clueNumber: revealedCount }]);
    getHaptics().trigger("error");
    toast.error("Wrong diagnosis!");
    setSelectedDiagnosis("");
    if (allRevealed) {
      saveAttempt(game.id, "lost", totalClues);
      setGameState("lost");
    } else {
      revealNextClue();
    }
  }

  function handleSkip() {
    getHaptics().trigger("light");
    setGuessHistory((prev) => [...prev, { type: "skip", clueNumber: revealedCount }]);
    setSelectedDiagnosis("");
    if (allRevealed) {
      saveAttempt(game.id, "lost", totalClues);
      setGameState("lost");
    } else {
      revealNextClue();
    }
  }

  function revealNextClue() {
    setRevealedCount((prev) => Math.min(prev + 1, totalClues));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {game.clues.map((clue, index) => (
          <div
            key={index}
            className={cn(
              "rounded-lg border p-4 transition-all",
              index < revealedCount
                ? "bg-card"
                : "bg-muted/30 border-muted"
            )}
          >
            {index < revealedCount ? (
              <>
                {clue.label && <p className="text-xs text-muted-foreground mb-1">{clue.label}</p>}
                <p className="text-base text-center">{clue.text}</p>
                {clue.imageUrl && (
                  <div className="mt-2 flex justify-center">
                    <button type="button" onClick={() => setLightboxSrc(clue.imageUrl!)} className="cursor-zoom-in">
                      <Image
                        src={clue.imageUrl}
                        alt={clue.label ?? `Clue ${index + 1}`}
                        width={400}
                        height={200}
                        className="h-48 w-auto rounded-md border object-contain"
                      />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-base text-center select-none text-muted-foreground">...</p>
            )}
          </div>
        ))}
      </div>

      {gameState !== "playing" && !dialogOpen && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/50 p-3 text-center text-base">
            <span className={gameState === "won" ? "text-green-500 font-semibold" : "text-red-700 font-semibold"}>
              {gameState === "won" ? `Correct! ${answerName}` : `Answer: ${answerName}`}
            </span>
            <Link href="/" className="ml-3 underline underline-offset-2 text-muted-foreground hover:text-foreground">
              Back to Levels
            </Link>
          </div>
          {guessHistory.length > 0 && (
            <div className="space-y-1">
              {guessHistory.map((entry, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  <span className="ml-2 opacity-60">Clue {entry.clueNumber}: </span>
                  {entry.type === "wrong" ? (
                    <span className="text-destructive">{entry.name}</span>
                  ) : (
                    <span className="italic">Skipped</span>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {gameState === "playing" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <DiagnosisCombobox
                diagnoses={diagnoses}
                value={selectedDiagnosis}
                onSelect={setSelectedDiagnosis}
                onSubmit={handleGuess}
                disabledIds={disabledIds}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGuess} className="flex-1 sm:flex-initial">Guess</Button>
              <Button variant="outline" onClick={handleSkip} className="flex-1 sm:flex-initial">Skip</Button>
            </div>
          </div>

          {guessHistory.length > 0 && (
            <div className="space-y-1">
              {guessHistory.map((entry, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  <span className="ml-2 opacity-60">Clue {entry.clueNumber}: </span>
                  {entry.type === "wrong" ? (
                    <span className="text-destructive">{entry.name}</span>
                  ) : (
                    <span className="italic">Skipped</span>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={gameState !== "playing" && dialogOpen} onOpenChange={(open) => { if (!open) setRevealedCount(totalClues); setDialogOpen(open); }}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-xl">{gameState === "won" ? "Correct!" : "Game Over"}</DialogTitle>
            <DialogDescription render={<div />}>
              <span className={cn("block text-base font-semibold", gameState === "won" ? "text-green-500" : "text-red-700")}>
                {gameState === "won" ? answerName : `Answer: ${answerName}`}
              </span>
              {gameState === "won" && (
                <span className="block text-muted-foreground">Solved with {revealedCount} clue{revealedCount !== 1 ? "s" : ""}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => { setRevealedCount(totalClues); setDialogOpen(false); }}>Admire Puzzle</Button>
            <Link href="/">
              <Button className="w-full">Back to Levels</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <Image
            src={lightboxSrc}
            alt="Clue image"
            width={1200}
            height={900}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
