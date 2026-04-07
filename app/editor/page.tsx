import { EditorForm } from "@/components/editor-form";
import { getDiagnoses } from "@/lib/queries";
import { FadeIn } from "@/components/fade-in";

export default async function EditorPage() {
  const diagnoses = await getDiagnoses();

  return (
    <div className="space-y-6">
      <FadeIn className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Create New Case</h1>
        <p className="text-muted-foreground">Add a clinical case for the community</p>
      </FadeIn>
      <EditorForm diagnoses={diagnoses} />
    </div>
  );
}
