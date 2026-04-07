"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiagnosisCombobox } from "@/components/diagnosis-combobox";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Diagnosis } from "@/lib/types";
import { FaXmark } from "react-icons/fa6";

interface EditorFormProps {
  diagnoses: Diagnosis[];
}

interface ClueInput {
  label: string;
  text: string;
  imageFile: File | null;
  imagePreview: string | null;
}

export function EditorForm({ diagnoses }: EditorFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [answerId, setAnswerId] = useState("");
  const [clues, setClues] = useState<ClueInput[]>(
    Array.from({ length: 6 }, () => ({ label: "", text: "", imageFile: null, imagePreview: null }))
  );
  const [submitting, setSubmitting] = useState(false);

  function updateClue(index: number, field: "label" | "text", value: string) {
    setClues((prev) =>
      prev.map((clue, i) => (i === index ? { ...clue, [field]: value } : clue))
    );
  }

  function handleImageSelect(index: number, file: File | null) {
    setClues((prev) =>
      prev.map((clue, i) => {
        if (i !== index) return clue;
        if (clue.imagePreview) URL.revokeObjectURL(clue.imagePreview);
        if (!file) return { ...clue, imageFile: null, imagePreview: null };
        return { ...clue, imageFile: file, imagePreview: URL.createObjectURL(file) };
      })
    );
  }

  function removeImage(index: number) {
    handleImageSelect(index, null);
  }

  async function uploadImage(file: File): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("clue-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("clue-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!answerId) { toast.error("Select a correct diagnosis"); return; }
    if (clues.some((c) => !c.text.trim())) { toast.error("All 6 clue texts are required"); return; }

    setSubmitting(true);
    try {
      const formattedClues = await Promise.all(
        clues.map(async (c) => {
          const clue: Record<string, string> = { text: c.text.trim() };
          if (c.label.trim()) clue.label = c.label.trim();
          if (c.imageFile) clue.imageUrl = await uploadImage(c.imageFile);
          return clue;
        })
      );

      const supabase = createClient();
      const { error } = await supabase.from("games").insert({
        title: title.trim(),
        answer_id: answerId,
        clues: formattedClues,
      });

      if (error) { toast.error("Failed to create case"); return; }
      toast.success("Case created!");
      router.push("/");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setSubmitting(false);
    }
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
          <div key={index} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input className="sm:w-32" placeholder="Label" value={clue.label} onChange={(e) => updateClue(index, "label", e.target.value)} />
              <Input className="flex-1" placeholder={`Clue ${index + 1} text...`} value={clue.text} onChange={(e) => updateClue(index, "text", e.target.value)} />
            </div>
            {clue.imagePreview ? (
              <div className="relative inline-block">
                <Image
                  src={clue.imagePreview}
                  alt={`Clue ${index + 1} image`}
                  width={200}
                  height={150}
                  className="rounded-md border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                >
                  <FaXmark className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageSelect(index, e.target.files?.[0] ?? null)}
                />
                + Add image
              </label>
            )}
          </div>
        ))}
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Case"}
      </Button>
    </form>
  );
}
