"use client";

import { useEffect, useState } from "react";
import { LuSettings } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useSoundEnabled } from "@/components/sound-provider";
import { getHaptics } from "@/lib/haptics";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ALL_SHUFFLE_FILTERS,
  getShuffleFilters,
  setShuffleFilters,
  type ShuffleFilter,
} from "@/lib/shuffle-filter";

const ATTEMPTS_STORAGE_KEY = "lapd-attempts";

const FILTER_LABELS: Record<ShuffleFilter, string> = {
  completed: "Completed",
  failed: "Failed",
  unseen: "Unseen",
};

export function SettingsDrawer({ externalOpen, onExternalOpenChange }: { externalOpen?: boolean; onExternalOpenChange?: (open: boolean) => void } = {}) {
  const { play } = useSoundEnabled();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = onExternalOpenChange ?? setInternalOpen;
  const [filters, setFilters] = useState<ShuffleFilter[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);


  useEffect(() => {
    setFilters(getShuffleFilters());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setShuffleFilters(filters);
  }, [filters, hydrated]);

  function toggleFilter(f: ShuffleFilter) {
    getHaptics().trigger("selection");
    setFilters((prev) => {
      if (prev.includes(f)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== f);
      }
      return [...prev, f];
    });
  }

  function handleReset() {
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: ATTEMPTS_STORAGE_KEY }));
    setResetOpen(false);
    toast.success("Progress reset", { duration: 1500 });
  }

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button data-no-click-sound variant="ghost" size="icon" className="text-muted-foreground" aria-label="Settings" onClick={() => { play("click"); getHaptics().trigger("light"); }}>
            <LuSettings className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </DrawerTrigger>

        <DrawerContent >
          <DrawerTitle className="sr-only">Settings</DrawerTitle>
          <div className="max-w-4xl mx-auto overflow-y-auto px-4 py-6 space-y-8">
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">Shuffle</h2>
                <p className="text-base text-muted-foreground">
                  Which cases the Shuffle button pulls from.
                </p>
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                {ALL_SHUFFLE_FILTERS.map((f) => {
                  const isOnlySelected = filters.length === 1 && filters[0] === f;
                  return (
                    <label
                      key={f}
                      className="flex cursor-pointer items-center gap-3 text-base"
                    >
                      <input
                        type="checkbox"
                        checked={filters.includes(f)}
                        disabled={isOnlySelected}
                        onChange={() => toggleFilter(f)}
                        className="h-4 w-4 cursor-pointer accent-foreground disabled:cursor-not-allowed"
                      />
                      {FILTER_LABELS[f]}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">Progress</h2>
                <p className="text-base text-muted-foreground">
                  Clears all your case results. This cannot be undone.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <Button variant="destructive" onClick={() => { setOpen(false); setResetOpen(true); }}>
                  Reset progress
                </Button>
              </div>
            </section>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-xl">Reset progress?</DialogTitle>
            <DialogDescription render={<div />}>
              <span className="block text-muted-foreground">
                This clears all your case results. This cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button variant="destructive" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
