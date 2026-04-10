"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { DiagnosisCombobox } from "@/components/diagnosis-combobox";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import type { Game, Diagnosis } from "@/lib/types";
import { getHaptics } from "@/lib/haptics";
import { saveAttempt } from "@/lib/attempts";
import { useSoundEnabled } from "@/components/sound-provider";
import { FadeIn } from "./fade-in";
import { motion } from "motion/react";

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
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [guessHistory, setGuessHistory] = useState<GuessEntry[]>([]);

  const { play } = useSoundEnabled();

  const totalClues = game.clues.length;
  const disabledIds = new Set(guessHistory.filter((g) => g.diagnosisId).map((g) => g.diagnosisId!));

  const allRevealed = revealedCount >= totalClues;

  function handleGuess() {
    if (!selectedDiagnosis) {
      play("error");
      toast.error("Select a diagnosis first", { duration: 1500 });
      return;
    }
    if (selectedDiagnosis === game.answer_id) {
      play("click");
      getHaptics().trigger("success");
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 1, x: 0.5 },
        gravity: 1,
        startVelocity: 45,
      });
      saveAttempt(game.id, "won", revealedCount);
      setGameState("won");
      return;
    }
    const name = diagnoses.find((d) => d.id === selectedDiagnosis)?.name ?? "";
    setGuessHistory((prev) => [...prev, { type: "wrong", diagnosisId: selectedDiagnosis, name, clueNumber: revealedCount }]);
    play("wrong");
    getHaptics().trigger("error");
    toast.error("Wrong diagnosis!", { duration: 1500 });
    setSelectedDiagnosis("");
    if (allRevealed) {
      saveAttempt(game.id, "lost", totalClues);
      setGameState("lost");
    } else {
      revealNextClue();
    }
  }

  function handleSkip() {
    play("skip");
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Enter" || gameState !== "playing") return;
      if (e.metaKey || e.shiftKey) {
        e.preventDefault();
        handleSkip();
        return;
      }
      // Don't double-fire when the combobox input already handles Enter
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault();
      handleGuess();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDiagnosis, gameState, allRevealed],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
              <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-base text-center">{clue.text}</p>
                {clue.imageUrl && (
                  <div className="mt-2 flex justify-center">
                    <button type="button" onClick={() => { setLightboxSrc(clue.imageUrl!); requestAnimationFrame(() => requestAnimationFrame(() => setLightboxVisible(true))); }} className="cursor-zoom-in">
                      <Image
                        src={clue.imageUrl}
                        alt={`Clue ${index + 1}`}
                        width={400}
                        height={200}
                        className="h-48 w-auto rounded-md border object-contain"
                      />
                    </button>
                  </div>
                )}
              </motion.div>
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
          <div className="flex flex-col-reverse sm:flex-row gap-2">
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
              <Button data-no-click-sound onClick={handleGuess} className="flex-1 sm:flex-initial">Guess</Button>
              <Button data-no-click-sound variant="outline" onClick={handleSkip} className="flex-1 sm:flex-initial">Skip</Button>
            </div>
          </div>

          {guessHistory.length > 0 && (
            <div className="space-y-1">
              {guessHistory.map((entry, i) => (
                <FadeIn key={i}>
                  <p className="text-sm text-muted-foreground">
                    <span className="ml-2 opacity-60">Clue {entry.clueNumber}: </span>
                    {entry.type === "wrong" ? (
                      <span className="text-destructive">{entry.name}</span>
                    ) : (
                      <span className="italic">Skipped</span>
                    )}
                  </p>
                </FadeIn>
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
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center cursor-zoom-out transition-colors duration-300",
            lightboxVisible ? "bg-black/80" : "bg-black/0"
          )}
          onClick={() => {
            setLightboxVisible(false);
            setTimeout(() => setLightboxSrc(null), 300);
          }}
          onTransitionEnd={(e) => {
            if (!lightboxVisible && e.target === e.currentTarget) setLightboxSrc(null);
          }}
        >
          <Image
            src={lightboxSrc}
            alt="Clue image"
            width={1200}
            height={900}
            className={cn(
              "max-h-[90vh] max-w-[90vw] rounded-lg object-contain transition-all duration-300",
              lightboxVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
            )}
          />
        </div>
      )}
    </div >
  );
}
