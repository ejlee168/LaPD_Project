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

  const data = gameResult.data;
  const diagnoses = (diagnosesResult.data ?? []) as Diagnosis[];

  // Supabase returns the joined relation; extract the answer name
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
