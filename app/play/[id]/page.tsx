import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GameBoard } from "@/components/game-board";
import { getDiagnoses } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import type { Game } from "@/lib/types";

function GameBoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="rounded-lg border p-4">
          <Skeleton className="h-5 w-full" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-muted bg-muted/30 p-4">
            <Skeleton className="h-5 w-16 bg-muted-foreground/10" />
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

async function GameLoader({ id }: { id: string }) {
  const supabase = await createClient();

  const [gameResult, diagnoses] = await Promise.all([
    supabase
      .from("games")
      .select("id, title, answer_id, clues, created_at, diagnoses(name)")
      .eq("id", id)
      .single(),
    getDiagnoses(),
  ]);

  if (gameResult.error || !gameResult.data) {
    notFound();
  }

  const data = gameResult.data;

  const joinedDiagnosis = data.diagnoses as unknown as { name: string } | { name: string }[] | null;
  const answerName = Array.isArray(joinedDiagnosis)
    ? joinedDiagnosis[0]?.name ?? "Unknown"
    : joinedDiagnosis?.name ?? "Unknown";

  const game: Game = {
    id: data.id,
    title: data.title,
    answer_id: data.answer_id,
    clues: data.clues,
    created_at: data.created_at,
  };

  return <GameBoard game={game} diagnoses={diagnoses} answerName={answerName} />;
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">What&apos;s the diagnosis?</h1>
      </div>
      <Suspense fallback={<GameBoardSkeleton />}>
        <GameLoader id={id} />
      </Suspense>
    </div>
  );
}
