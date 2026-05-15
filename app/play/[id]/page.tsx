import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GameBoard } from "@/components/game-board";
import { getDiagnoses } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/fade-in";
import type { Game } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: `🏥🩸 Code Blue | ${data?.title}`,
  };
}

function GameBoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8" />
      <div className="space-y-3">
        <div className="rounded-lg border p-4">
          <Skeleton className="h-6 w-full" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="text-base text-center select-none text-muted-foreground">...</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <div className="flex-1">
            <Input disabled placeholder="Search diagnoses..." />
          </div>
          <div className="flex gap-2">
            <Button disabled className="flex-1 sm:flex-initial">Guess</Button>
            <Button disabled variant="outline" className="flex-1 sm:flex-initial">Skip</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function GameLoader({ id }: { id: string }) {
  const supabase = await createClient();

  const [gameResult, diagnoses] = await Promise.all([
    supabase
      .from("games")
      .select("id, title, answer_id, clues, created_at, diagnoses(name, categories(category))")
      .eq("id", id)
      .single(),
    getDiagnoses(),
  ]);

  if (gameResult.error || !gameResult.data) {
    notFound();
  }

  const data = gameResult.data;

  type JoinedDiagnosis = {
    name: string;
    categories: { category: string } | { category: string }[] | null;
  };
  const joinedDiagnosis = data.diagnoses as unknown as JoinedDiagnosis | JoinedDiagnosis[] | null;
  const diag = Array.isArray(joinedDiagnosis) ? joinedDiagnosis[0] : joinedDiagnosis;
  const answerName = diag?.name ?? "Unknown";
  const cats = diag?.categories;
  const cat = Array.isArray(cats) ? cats[0] : cats;
  const category = cat?.category ?? null;

  const game: Game = {
    id: data.id,
    title: data.title,
    answer_id: data.answer_id,
    clues: data.clues,
    created_at: data.created_at,
  };

  return <GameBoard game={game} diagnoses={diagnoses} answerName={answerName} category={category} />;
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Suspense fallback={<GameBoardSkeleton />}>
        <GameLoader id={id} />
      </Suspense>
    </div>
  );
}
