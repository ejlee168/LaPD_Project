import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseGrid } from "@/components/case-grid";
import { FadeIn } from "@/components/fade-in";

function CaseGridSkeleton() {
  return (
    <>
      <div className="flex flex-row max-w-md mx-auto items-center gap-5">
        <Input placeholder="search cases..." disabled />
        <p>or</p>
        <div className="text-center">
          <Link tabIndex={-1} href="/editor" >
            <Button className="py-4" ><span className="pl-0.5">+</span>create a case</Button>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </>
  );
}

async function CaseGridLoader() {
  const supabase = await createClient();
  const { data: games } = await supabase
    .from("games")
    .select("id, title, author, created_at")
    .order("created_at", { ascending: false });

  return <CaseGrid games={games ?? []} />;
}

export default function HomePage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <FadeIn className="text-center space-y-2">
        <h1 className="text-2xl font-bold">LaPD Project</h1>
        <p className="text-muted-foreground">guess the diagnosis from clinical clues</p>
      </FadeIn>
      <Suspense fallback={<CaseGridSkeleton />}>
        <CaseGridLoader />
      </Suspense>
    </div>
  );
}
