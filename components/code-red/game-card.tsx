"use client";

import { cn } from "@/lib/utils";
import { AutoFitText } from "@/components/code-red/auto-fit-text";
import type { CrCard, CardType } from "@/lib/code-red/types";

interface Props {
  card: CrCard;
  spymasterView: boolean;
  canClick: boolean;
  revealAll?: boolean;
  onClick?: () => void;
}

function bgForType(t: CardType): string {
  switch (t) {
    case "red": return "bg-red-500/25 border-red-500/60";
    case "blue": return "bg-blue-500/25 border-blue-500/60";
    case "neutral": return "bg-stone-400/30 border-stone-500/60";
    case "assassin": return "bg-neutral-900 text-white border-neutral-700";
  }
}

export function GameCard({ card, spymasterView, canClick, revealAll, onClick }: Props) {
  const revealed = card.revealed;
  const showColor = revealed || spymasterView || !!revealAll;
  const showText = !revealed || !!revealAll;
  const boldText = !!revealAll && !revealed;
  return (
    <button
      type="button"
      onClick={canClick && !revealed ? onClick : undefined}
      disabled={!canClick || revealed}
      className={cn(
        "aspect-4/3 rounded-lg border font-medium transition-all overflow-hidden",
        "flex items-center justify-center p-2",
        showColor ? bgForType(card.card_type) : "bg-card border-border",
        revealed && !revealAll && "opacity-70",
        revealed && revealAll && "opacity-60",
        canClick && !revealed && "hover:-translate-y-0.5 hover:shadow cursor-pointer",
        !canClick && !revealed && "cursor-default",
      )}
      aria-label={`card ${card.position + 1}${revealed ? " revealed" : ""}`}
    >
      {showText && (
        <AutoFitText
          text={card.sign_name ?? `#${card.position}`}
          className={boldText ? "font-bold" : undefined}
        />
      )}
    </button>
  );
}
