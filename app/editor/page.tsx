import { Suspense } from "react";
import { EditorForm } from "@/components/editor-form";
import { getDiagnoses } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/fade-in";

function EditorFormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-8 sm:w-32 rounded-lg" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
}

async function EditorFormLoader() {
  const diagnoses = await getDiagnoses();
  return <EditorForm diagnoses={diagnoses} />;
}

export default function EditorPage() {
  return (
    <div className="space-y-6">
      <FadeIn className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Create New Case</h1>
        <p className="text-muted-foreground">Add a clinical case for the community</p>
      </FadeIn>
      <Suspense fallback={<EditorFormSkeleton />}>
        <EditorFormLoader />
      </Suspense>
    </div>
  );
}
