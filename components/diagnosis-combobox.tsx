"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Diagnosis } from "@/lib/types";

interface DiagnosisComboboxProps {
  diagnoses: Diagnosis[];
  value: string;
  onSelect: (diagnosisId: string) => void;
  onDiagnosisCreated?: (diagnosis: Diagnosis) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabledIds?: Set<string>;
  allowCreate?: boolean;
}

export function DiagnosisCombobox({
  diagnoses, value, onSelect, onDiagnosisCreated, onSubmit, placeholder = "Search diagnoses...", disabledIds, allowCreate = false,
}: DiagnosisComboboxProps) {
  const selectedName = diagnoses.find((d) => d.id === value)?.name ?? "";
  const [query, setQuery] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const userEditingRef = useRef(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const filtered = useMemo(() => {
    if (!open && !query.trim()) return [];
    return query.trim()
      ? diagnoses.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()))
      : diagnoses;
  }, [open, query, diagnoses]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? diagnoses.some((d) => d.name.toLowerCase() === q) : true;
  }, [query, diagnoses]);

  // Reset highlight when filtered results change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered]);

  function handleSelect(diagnosis: Diagnosis) {
    userEditingRef.current = false;
    onSelect(diagnosis.id);
    setQuery(diagnosis.name);
    setOpen(false);
  }

  function handleCreateClick() {
    setOpen(false);
    setConfirmOpen(true);
  }

  function toTitleCase(str: string): string {
    const articles = new Set(["a", "an", "the", "of", "in", "on", "at", "to", "for", "with", "and", "but", "or", "nor", "vs", "aka"]);
    return str
      .split(" ")
      .map((word, i) => {
        if (i === 0 || !articles.has(word.toLowerCase())) {
          // Handle parenthesized words like "(acute)"
          if (word.startsWith("(") && word.length > 1) {
            return "(" + word.charAt(1).toUpperCase() + word.slice(2);
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word.toLowerCase();
      })
      .join(" ");
  }

  async function handleConfirmCreate() {
    const name = toTitleCase(query.trim());
    if (!name) return;

    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("diagnoses")
      .insert({ name })
      .select("id, name")
      .single();

    setCreating(false);
    setConfirmOpen(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("This diagnosis already exists", { duration: 1500 });
      } else {
        toast.error("Failed to create diagnosis", { duration: 1500 });
      }
      return;
    }

    toast.success(`Created "${data.name}"`, { duration: 1500 });
    onDiagnosisCreated?.(data);
    onSelect(data.id);
    setQuery(data.name);
    userEditingRef.current = false;
  }

  // Sync query when value changes externally (e.g. cleared after guess/skip)
  // but not when the user is actively editing the text
  useEffect(() => {
    if (userEditingRef.current) {
      // Value was cleared because user edited text — don't overwrite their typing
      if (!value) return;
      // Value was set (e.g. via Enter auto-select) — sync and stop editing mode
      userEditingRef.current = false;
    }
    setQuery(selectedName);
  }, [value, selectedName]);

  function handleInputChange(val: string) {
    userEditingRef.current = true;
    setQuery(val);
    setOpen(true);
    if (value && val !== selectedName) {
      onSelect("");
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function highlightMatch(name: string) {
    const q = query.trim().toLowerCase();
    if (!q) return name;
    const start = name.toLowerCase().indexOf(q);
    if (start === -1) return name;
    return (
      <>
        {name.slice(0, start)}
        <span className="font-bold">{name.slice(start, start + q.length)}</span>
        {name.slice(start + q.length)}
      </>
    );
  }

  const showCreateOption = allowCreate && query.trim() && !hasExactMatch;

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open) { setOpen(true); return; }
              setHighlightIndex((prev) => {
                const max = filtered.length + (showCreateOption ? 1 : 0) - 1;
                return prev < max ? prev + 1 : 0;
              });
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) { setOpen(true); return; }
              setHighlightIndex((prev) => {
                const max = filtered.length + (showCreateOption ? 1 : 0) - 1;
                return prev > 0 ? prev - 1 : max;
              });
            } else if (e.key === "Escape") {
              setOpen(false);
              setHighlightIndex(-1);
            } else if (e.key === "Enter" && !e.metaKey && !e.shiftKey) {
              e.preventDefault();
              // Select highlighted item if one is highlighted
              if (open && highlightIndex >= 0) {
                if (highlightIndex < filtered.length) {
                  const item = filtered[highlightIndex];
                  if (!disabledIds?.has(item.id)) {
                    handleSelect(item);
                    return;
                  }
                } else if (showCreateOption) {
                  handleCreateClick();
                  return;
                }
              }
              // Fallback: auto-select if exactly one non-disabled match
              if (!value) {
                const eligible = filtered.filter((d) => !disabledIds?.has(d.id));
                if (eligible.length === 1) {
                  onSelect(eligible[0].id);
                  setQuery(eligible[0].name);
                }
              }
              setOpen(false);
              onSubmit?.();
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        {open && query.trim() && (filtered.length > 0 || showCreateOption) && (
          <ul ref={listRef} className="absolute z-50 mt-1 max-h-50 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
            {filtered.map((diagnosis, index) => {
              const isDisabled = disabledIds?.has(diagnosis.id);
              const isSelected = diagnosis.id === value;
              const isHighlighted = index === highlightIndex;
              return (
                <li
                  key={diagnosis.id}
                  ref={(el) => { if (isHighlighted && el) el.scrollIntoView({ block: "nearest" }); }}
                  onClick={() => !isDisabled && handleSelect(diagnosis)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  className={cn(
                    "cursor-pointer rounded-sm px-2 py-1.5 text-base",
                    (isSelected || isHighlighted) && "bg-accent text-accent-foreground",
                    isDisabled ? "opacity-40 line-through cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {highlightMatch(diagnosis.name)}
                </li>
              );
            })}
            {showCreateOption && (
              <li
                ref={(el) => { if (highlightIndex === filtered.length && el) el.scrollIntoView({ block: "nearest" }); }}
                onClick={handleCreateClick}
                onMouseEnter={() => setHighlightIndex(filtered.length)}
                className={cn(
                  "cursor-pointer rounded-sm px-2 py-1.5 text-base text-primary hover:bg-accent hover:text-accent-foreground",
                  highlightIndex === filtered.length && "bg-accent text-accent-foreground",
                )}
              >
                + Create &quot;{query.trim()}&quot;
              </li>
            )}
          </ul>
        )}
        {open && query.trim() && filtered.length === 0 && !showCreateOption && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 text-base text-muted-foreground shadow-md">
            No diagnosis found.
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new diagnosis?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re about to add <strong>&quot;{toTitleCase(query.trim())}&quot;</strong> as a new diagnosis. Please make sure it doesn&apos;t already exist under a different name or spelling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreate} disabled={creating}>
              {creating ? "Creating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
