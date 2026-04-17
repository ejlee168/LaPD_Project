"use client";

import { useRouter } from "next/navigation";
import { LuCopy, LuLogOut } from "react-icons/lu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { leaveLobby } from "@/lib/code-red/client";
import type { CrPlayer } from "@/lib/code-red/types";

interface Props {
  code: string;
  me: CrPlayer | null;
  token: string;
}

function TeamBadge({ me }: { me: CrPlayer | null }) {
  if (!me) return null;
  const label = me.team === "red" ? "Red" : me.team === "blue" ? "Blue" : "Spectator";
  const classes =
    me.team === "red"
      ? "bg-red-500/15 text-red-600 ring-red-500/40 dark:text-red-400"
      : me.team === "blue"
      ? "bg-blue-500/15 text-blue-600 ring-blue-500/40 dark:text-blue-400"
      : "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1",
        classes,
      )}
    >
      {label}
    </span>
  );
}

export function LobbyHeader({ code, me, token }: Props) {
  const router = useRouter();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function leave() {
    if (!me) { router.push("/code-red"); return; }
    try {
      await leaveLobby(code, token);
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    router.push("/code-red");
  }

  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={copy}
          className="font-mono text-2xl tracking-widest cursor-pointer hover:text-primary transition-colors"
          aria-label="Copy lobby code"
        >
          {code}
        </button>
        <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Copy">
          <LuCopy />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <TeamBadge me={me} />
        <Button variant="ghost" size="sm" onClick={leave}>
          <LuLogOut /> Leave
        </Button>
      </div>
    </div>
  );
}
