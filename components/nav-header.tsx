"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShuffleButton } from "@/components/shuffle-button";
import { SoundToggle } from "@/components/sound-toggle";
import { SettingsDrawer } from "@/components/settings-drawer";
import { HelpSheet } from "@/components/help-sheet";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useSoundEnabled } from "@/components/sound-provider";

const THEME_ORDER = ["light", "dark", "system"] as const;

export function NavHeader() {
  const { muted, toggle: toggleSound, play } = useSoundEnabled();
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const shuffleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "A": {
          e.preventDefault();
          toggleSound();
          if (muted) play("click", true);
          break;
        }
        case "T": {
          e.preventDefault();
          play("click");
          const currentIndex = THEME_ORDER.indexOf(theme as typeof THEME_ORDER[number]);
          const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
          setTheme(THEME_ORDER[nextIndex]);
          break;
        }
        case "R": {
          e.preventDefault();
          play("click");
          setSettingsOpen((prev) => !prev);
          break;
        }
        case "S": {
          e.preventDefault();
          setHelpOpen(false);
          shuffleRef.current?.click();
          break;
        }
        case "?": {
          e.preventDefault();
          play("click");
          setHelpOpen((prev) => !prev);
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [muted, toggleSound, play, theme, setTheme]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Tooltip>
            <TooltipTrigger render={<span />}>
              <ShuffleButton ref={shuffleRef} />
            </TooltipTrigger>
            <TooltipContent className="flex font-bold flex-col justify-center items-center">
              Shuffle
              <KbdGroup><Kbd>⇧</Kbd><Kbd>S</Kbd></KbdGroup>
            </TooltipContent>
          </Tooltip>
        </div>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link data-no-click-sound href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">cases</Link>
          <Link data-no-click-sound href="/anki" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">anki</Link>
          <Tooltip>
            <TooltipTrigger render={<span />}>
              <SoundToggle />
            </TooltipTrigger>
            <TooltipContent className="flex font-bold flex-col justify-center items-center">
              Audio
              <KbdGroup><Kbd>⇧</Kbd><Kbd>A</Kbd></KbdGroup>
            </TooltipContent>
          </Tooltip>
          <div className="-translate-x-2 sm:-translate-x-4 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <ThemeToggle />
              </TooltipTrigger>
              <TooltipContent className="flex font-bold flex-col justify-center items-center">
                Theme
                <KbdGroup><Kbd>⇧</Kbd><Kbd>T</Kbd></KbdGroup>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <SettingsDrawer externalOpen={settingsOpen} onExternalOpenChange={setSettingsOpen} />
              </TooltipTrigger>
              <TooltipContent className="flex font-bold flex-col justify-center items-center">
                Settings
                <KbdGroup><Kbd>⇧</Kbd><Kbd>R</Kbd></KbdGroup>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <HelpSheet externalOpen={helpOpen} onExternalOpenChange={setHelpOpen} />
              </TooltipTrigger>
              <TooltipContent className="flex font-bold flex-col justify-center items-center">
                Help
                <KbdGroup><Kbd>⇧</Kbd><Kbd>?</Kbd></KbdGroup>
              </TooltipContent>
            </Tooltip>
          </div>
        </nav>
      </div>
    </header>
  );
}
