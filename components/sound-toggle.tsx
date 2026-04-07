"use client";

import { LuVolume2, LuVolumeOff } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { useSoundEnabled } from "@/components/sound-provider";

export function SoundToggle() {
  const { muted, toggle, play } = useSoundEnabled();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => { toggle(); if (muted) play("click", true); }}
      className="text-muted-foreground"
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      data-no-click-sound
    >
      {muted ? (
        <LuVolumeOff className="h-4 w-4" />
      ) : (
        <LuVolume2 className="h-4 w-4" />
      )}
    </Button>
  );
}
