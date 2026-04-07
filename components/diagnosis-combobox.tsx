"use client";

import { useState } from "react";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Diagnosis } from "@/lib/types";

interface DiagnosisComboboxProps {
  diagnoses: Diagnosis[];
  value: string;
  onSelect: (diagnosisId: string) => void;
  placeholder?: string;
}

export function DiagnosisCombobox({
  diagnoses, value, onSelect, placeholder = "Search diagnoses...",
}: DiagnosisComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedName = diagnoses.find((d) => d.id === value)?.name ?? "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between font-normal")}
      >
        {selectedName || placeholder}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No diagnosis found.</CommandEmpty>
            <CommandGroup>
              {diagnoses.map((diagnosis) => (
                <CommandItem
                  key={diagnosis.id}
                  value={diagnosis.name}
                  onSelect={() => {
                    onSelect(diagnosis.id === value ? "" : diagnosis.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === diagnosis.id ? "opacity-100" : "opacity-0")} />
                  {diagnosis.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
