import { Suspense } from "react";
import Link from "next/link";
import { LuArrowUpDown, LuFilter, LuLayers } from "react-icons/lu";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseGrid } from "@/components/case-grid";
import { FadeIn } from "@/components/fade-in";

function CaseGridSkeleton() {
  return (
    <>
      <div className="relative flex flex-col items-center gap-3 sm:block">
        <div className="flex flex-row max-w-md mx-auto items-center gap-5 w-full">
          <Input placeholder="search cases..." disabled />
          <p>or</p>
          <div className="text-center">
            <Link tabIndex={-1} href="/editor" >
              <Button className="py-4" ><span className="pl-0.5">+</span>create a case</Button>
            </Link>
          </div>
        </div>
        <div className="flex flex-row gap-1 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Filter cases"
            className="text-muted-foreground"
          >
            <LuFilter className="h-[1.2rem] w-[1.2rem]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sort cases"
            className="text-muted-foreground"
          >
            <LuArrowUpDown className="h-[1.2rem] w-[1.2rem]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Group cases by category"
            className="text-muted-foreground"
          >
            <LuLayers className="h-[1.2rem] w-[1.2rem]" />
          </Button>
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
    .select("id, title, author, created_at, diagnoses(categories(category))")
    .order("created_at", { ascending: false });

  const normalized = (games ?? []).map((g) => {
    const diagnoses = g.diagnoses as unknown as
      | { categories: { category: string } | { category: string }[] | null }
      | { categories: { category: string } | { category: string }[] | null }[]
      | null;
    const diag = Array.isArray(diagnoses) ? diagnoses[0] : diagnoses;
    const cats = diag?.categories;
    const cat = Array.isArray(cats) ? cats[0] : cats;
    return {
      id: g.id,
      title: g.title,
      author: g.author,
      created_at: g.created_at,
      category: cat?.category ?? null,
    };
  });

  return <CaseGrid games={normalized} />;
}

export default function HomePage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <FadeIn className="text-center space-y-2">
        <h1 className="text-2xl font-bold">🏥🩸 LaPD Project: Code Blue</h1>
        <p className="text-muted-foreground">guess the diagnosis from clinical clues</p>
      </FadeIn>
      <Suspense fallback={<CaseGridSkeleton />}>
        <CaseGridLoader />
      </Suspense>
    </div>
  );
}
