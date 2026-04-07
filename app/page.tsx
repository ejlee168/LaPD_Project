import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseCard } from "@/components/case-card";
import { FadeIn } from "@/components/fade-in";

function CaseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

async function CaseGrid({ q }: { q?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("games")
    .select("id, title, author, created_at")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data: games } = await query;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games?.map((game, index) => (
          <CaseCard
            key={game.id}
            id={game.id}
            title={game.title}
            author={game.author}
            createdAt={game.created_at}
            index={index}
          />
        ))}
      </div>
      {games?.length === 0 && (
        <p className="text-center text-muted-foreground">No cases found. Be the first to create one!</p>
      )}
    </>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <FadeIn className="text-center space-y-2">
        <h1 className="text-2xl font-bold">LaPD Project</h1>
        <p className="text-muted-foreground">Guess the diagnosis from clinical clues</p>
      </FadeIn>
      <div className="flex flex-row max-w-md mx-auto items-center gap-5">
        <form>
          <Input name="q" placeholder="Search cases..." defaultValue={q ?? ""} />
        </form>
        <p>or</p>
        <div className="text-center">
          <Link href="/editor">
            <Button className="py-4">+ Create a Case</Button>
          </Link>
        </div>
      </div>
      <Suspense fallback={<CaseGridSkeleton />}>
        <CaseGrid q={q} />
      </Suspense>

    </div>
  );
}
