import { createClient } from "@/lib/supabase/server";
import { EditorForm } from "@/components/editor-form";
import type { Diagnosis } from "@/lib/types";

export default async function EditorPage() {
  const supabase = await createClient();
  const { data: diagnoses } = await supabase.from("diagnoses").select("id, name").order("name");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Create New Case</h1>
        <p className="text-muted-foreground">Add a clinical case for the community</p>
      </div>
      <EditorForm diagnoses={(diagnoses ?? []) as Diagnosis[]} />
    </div>
  );
}
