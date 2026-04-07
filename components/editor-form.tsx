"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiagnosisCombobox } from "@/components/diagnosis-combobox";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Diagnosis } from "@/lib/types";

interface EditorFormProps {
  diagnoses: Diagnosis[];
}

export function EditorForm({ diagnoses }: EditorFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [answerId, setAnswerId] = useState("");
  const [clues, setClues] = useState(
    Array.from({ length: 6 }, () => ({ label: "", text: "" }))
  );
  const [submitting, setSubmitting] = useState(false);

  function updateClue(index: number, field: "label" | "text", value: string) {
    setClues((prev) =>
      prev.map((clue, i) => (i === index ? { ...clue, [field]: value } : clue))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!answerId) { toast.error("Select a correct diagnosis"); return; }
    if (clues.some((c) => !c.text.trim())) { toast.error("All 6 clue texts are required"); return; }

    setSubmitting(true);
    const supabase = createClient();
    const formattedClues = clues.map((c) => ({
      ...(c.label.trim() ? { label: c.label.trim() } : {}),
      text: c.text.trim(),
    }));

    const { error } = await supabase.from("games").insert({
      title: title.trim(),
      answer_id: answerId,
      clues: formattedClues,
    });

    setSubmitting(false);
    if (error) { toast.error("Failed to create case"); return; }
    toast.success("Case created!");
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input placeholder='e.g. "Case #5: Headache"' value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Correct Diagnosis</label>
        <DiagnosisCombobox diagnoses={diagnoses} value={answerId} onSelect={setAnswerId} placeholder="Select the answer..." />
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium">Clues (6 required)</label>
        {clues.map((clue, index) => (
          <div key={index} className="flex gap-2">
            <Input className="w-32" placeholder="Label" value={clue.label} onChange={(e) => updateClue(index, "label", e.target.value)} />
            <Input className="flex-1" placeholder={`Clue ${index + 1} text...`} value={clue.text} onChange={(e) => updateClue(index, "text", e.target.value)} />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Case"}
      </Button>
    </form>
  );
}
