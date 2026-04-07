import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Game } from "@/lib/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("games")
    .select("id, title, clues, created_at")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data: games } = await query;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">LaPD</h1>
        <p className="text-muted-foreground">Guess the diagnosis from clinical clues</p>
      </div>
      <form className="max-w-md mx-auto">
        <Input name="q" placeholder="Search cases..." defaultValue={q ?? ""} />
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games?.map((game) => (
          <Link key={game.id} href={`/play/${game.id}`}>
            <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">{game.title}</CardTitle>
                <CardDescription>{game.clues.length} clues</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      {games?.length === 0 && (
        <p className="text-center text-muted-foreground">No cases found. Be the first to create one!</p>
      )}
      <div className="text-center">
        <Link href="/editor">
          <Button>+ Create a Case</Button>
        </Link>
      </div>
    </div>
  );
}
