"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Diagnosis } from "@/lib/types";

interface DiagnosisComboboxProps {
  diagnoses: Diagnosis[];
  value: string;
  onSelect: (diagnosisId: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabledIds?: Set<string>;
}

export function DiagnosisCombobox({
  diagnoses, value, onSelect, onSubmit, placeholder = "Search diagnoses...", disabledIds,
}: DiagnosisComboboxProps) {
  const selectedName = diagnoses.find((d) => d.id === value)?.name ?? "";
  const [query, setQuery] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input text when value changes externally (e.g. cleared after guess)
  useEffect(() => {
    setQuery(selectedName);
  }, [selectedName]);

  const filtered = query.trim()
    ? diagnoses.filter((d) =>
        d.name.toLowerCase().includes(query.toLowerCase())
      )
    : diagnoses;

  function handleSelect(diagnosis: Diagnosis) {
    onSelect(diagnosis.id);
    setQuery(diagnosis.name);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleInputChange(val: string) {
    setQuery(val);
    setOpen(true);
    // Clear selection if user edits away from selected name
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

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            // Auto-select if exactly one non-disabled match and nothing selected
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
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.map((diagnosis) => {
            const isDisabled = disabledIds?.has(diagnosis.id);
            const isSelected = diagnosis.id === value;
            return (
              <li
                key={diagnosis.id}
                onClick={() => !isDisabled && handleSelect(diagnosis)}
                className={cn(
                  "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                  isSelected && "bg-accent text-accent-foreground",
                  isDisabled ? "opacity-40 line-through cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {diagnosis.name}
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md">
          No diagnosis found.
        </div>
      )}
    </div>
  );
}
