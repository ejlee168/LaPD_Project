import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { AnkiPack } from "@/lib/types";

export default async function AnkiPage() {
  const supabase = await createClient();
  const { data: packs } = await supabase
    .from("anki_packs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Anki Packs</h1>
        <p className="text-muted-foreground">Download flashcard decks for study</p>
      </div>
      <div className="max-w-2xl mx-auto space-y-3">
        {(packs as AnkiPack[] | null)?.map((pack) => {
          const { data: urlData } = supabase.storage.from("anki-packs").getPublicUrl(pack.file_path);
          return (
            <Card key={pack.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{pack.name}</CardTitle>
                  <CardDescription>{pack.description}</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={urlData.publicUrl} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </CardHeader>
            </Card>
          );
        })}
        {(!packs || packs.length === 0) && (
          <p className="text-center text-muted-foreground">No Anki packs available yet.</p>
        )}
      </div>
    </div>
  );
}
