"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiagnosisCombobox } from "@/components/diagnosis-combobox";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSoundEnabled } from "@/components/sound-provider";
import type { Diagnosis } from "@/lib/types";
import { FaXmark } from "react-icons/fa6";

interface EditorFormProps {
  diagnoses: Diagnosis[];
}

interface ClueInput {
  text: string;
  imageFile: File | null;
  imagePreview: string | null;
}

export function EditorForm({ diagnoses }: EditorFormProps) {
  const router = useRouter();
  const { play } = useSoundEnabled();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [answerId, setAnswerId] = useState("");
  const [clues, setClues] = useState<ClueInput[]>(
    Array.from({ length: 6 }, () => ({ text: "", imageFile: null, imagePreview: null }))
  );
  const [submitting, setSubmitting] = useState(false);

  function updateClue(index: number, value: string) {
    setClues((prev) =>
      prev.map((clue, i) => (i === index ? { ...clue, text: value } : clue))
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

  async function uploadImage(supabase: ReturnType<typeof createClient>, file: File): Promise<string> {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("clue-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("clue-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { play("error"); toast.error("Title is required", { duration: 1500 }); return; }
    if (!answerId) { play("error"); toast.error("Select a correct diagnosis", { duration: 1500 }); return; }
    if (clues.some((c) => !c.text.trim())) { play("error"); toast.error("All 6 clue texts are required", { duration: 1500 }); return; }
    play("click");

    setSubmitting(true);
    const supabase = createClient();
    try {
      const formattedClues = await Promise.all(
        clues.map(async (c) => {
          const clue: Record<string, string> = { text: c.text.trim() };
          if (c.imageFile) clue.imageUrl = await uploadImage(supabase, c.imageFile);
          return clue;
        })
      );

      const { error } = await supabase.from("games").insert({
        title: title.trim(),
        ...(author.trim() ? { author: author.trim() } : {}),
        answer_id: answerId,
        clues: formattedClues,
      });

      if (error) { play("error"); toast.error("Failed to create case", { duration: 1500 }); return; }
      toast.success("Case created!", { duration: 1500 });
      router.push("/");
    } catch {
      play("error"); toast.error("Failed to upload image", { duration: 1500 });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input placeholder='e.g. "Headache"' value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Author <span className="text-muted-foreground font-normal">(optional)</span></label>
        <Input placeholder="Your name" value={author} onChange={(e) => setAuthor(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Correct Diagnosis</label>
        <DiagnosisCombobox diagnoses={diagnoses} value={answerId} onSelect={setAnswerId} placeholder="Select the answer..." />
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium">Clues</label>
        {clues.map((clue, index) => (
          <div key={index} className="space-y-2 rounded-lg border p-3">
            <Input placeholder={`Clue ${index + 1} text...`} value={clue.text} onChange={(e) => updateClue(index, e.target.value)} />
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
                  onClick={() => handleImageSelect(index, null)}
                  className="group absolute -top-2 -right-2 rounded-full bg-destructive/50 cursor-pointer p-1 text-destructive-foreground shadow-sm hover:bg-destructive/20"
                >
                  <FaXmark className="transition-colors h-3 w-3 text-background group-hover:text-destructive" />
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
      <Button data-no-click-sound type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Case"}
      </Button>
    </form>
  );
}
