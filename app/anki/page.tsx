import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/fade-in";
import { FaDownload } from "react-icons/fa6";
import type { AnkiPack } from "@/lib/types";

function PackListSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

async function PackList() {
  const supabase = await createClient();
  const { data: packs } = await supabase
    .from("anki_packs")
    .select("id, name, description, file_path, created_at")
    .order("created_at", { ascending: false });

  if (!packs || packs.length === 0) {
    return <p className="text-center text-muted-foreground">No Anki packs available yet.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {(packs as AnkiPack[]).map((pack) => {
        const { data: urlData } = supabase.storage.from("anki-packs").getPublicUrl(pack.file_path);
        return (
          <Card key={pack.id}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">{pack.name}</CardTitle>
                <CardDescription>{pack.description}</CardDescription>
              </div>
              <a href={urlData.publicUrl} download>
                <Button variant="outline" size="sm">
                  <FaDownload className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </a>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

export default function AnkiPage() {
  return (
    <div className="space-y-6">
      <FadeIn className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Anki Packs</h1>
        <p className="text-muted-foreground">download flashcard decks for study</p>
      </FadeIn>
      <Suspense fallback={<PackListSkeleton />}>
        <PackList />
      </Suspense>
    </div>
  );
}
