import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GameBoard } from "@/components/game-board";
import type { Game, Diagnosis } from "@/lib/types";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [gameResult, diagnosesResult] = await Promise.all([
    supabase
      .from("games")
      .select("id, title, answer_id, clues, created_at, diagnoses(name)")
      .eq("id", id)
      .single(),
    supabase.from("diagnoses").select("id, name").order("name"),
  ]);

  if (gameResult.error || !gameResult.data) {
    notFound();
  }

  const game = gameResult.data as Game;
  const diagnoses = (diagnosesResult.data ?? []) as Diagnosis[];
  const answerName = (game.diagnoses as unknown as { name: string })?.name ?? "Unknown";

  return <GameBoard game={game} diagnoses={diagnoses} answerName={answerName} />;
}
