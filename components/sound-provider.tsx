"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Howl } from "howler";
import { clicksSprite } from "@/lib/sounds";

type SpriteId = keyof typeof clicksSprite;

interface SoundContextValue {
  muted: boolean;
  toggle: () => void;
  play: (id: SpriteId, force?: boolean) => void;
}

const SoundContext = createContext<SoundContextValue>({
  muted: false,
  toggle: () => { },
  play: () => { },
});

export function useSoundEnabled() {
  return useContext(SoundContext);
}

let howl: Howl | null = null;
function getHowl() {
  if (!howl) {
    howl = new Howl({ src: ["/sounds/clicks.m4a"], sprite: clicksSprite });
  }
  return howl;
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sound-muted");
    if (stored === "false") setMuted(false);
  }, []);

  function toggle() {
    setMuted((prev) => {
      localStorage.setItem("sound-muted", String(!prev));
      return !prev;
    });
  }

  const play = useCallback(
    (id: SpriteId, force?: boolean) => {
      if (muted && !force) return;
      const h = getHowl();
      const soundId = h.play(id);
      h.volume(0.1, soundId);
    },
    [muted],
  );

  // Global click sound
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (muted) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-click-sound]")) return;
      if (target.closest("button, [role='button'], a, [data-slot='dropdown-menu-item'], [data-slot='dropdown-menu-checkbox-item'], [data-slot='dropdown-menu-radio-item']")) {
        const h = getHowl();
        const id = h.play("click");
        h.rate(0.8 + Math.random() * 0.2, id);
        h.volume(0.1, id);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [muted]);

  return (
    <SoundContext value={{ muted, toggle, play }}>
      {children}
    </SoundContext>
  );
}
