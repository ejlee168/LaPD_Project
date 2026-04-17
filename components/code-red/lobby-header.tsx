"use client";

import { useRouter } from "next/navigation";
import { LuCopy, LuLogOut } from "react-icons/lu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { leaveLobby } from "@/lib/code-red/client";
import type { CrPlayer } from "@/lib/code-red/types";

interface Props {
  code: string;
  me: CrPlayer | null;
  token: string;
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
      <Button variant="ghost" size="sm" onClick={leave}>
        <LuLogOut /> Leave
      </Button>
    </div>
  );
}
