"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/fade-in";
import { createLobby, joinLobby } from "@/lib/code-red/client";
import { getOrCreatePlayerToken } from "@/lib/code-red/player-token";

export default function CodeRedLandingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    const name = nickname.trim();
    if (!name) return toast.error("Enter a nickname");
    setBusy(true);
    try {
      const token = getOrCreatePlayerToken();
      const code = await createLobby(name, token);
      router.push(`/code-red/${code}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  async function handleJoin() {
    const name = nickname.trim();
    const code = joinCode.trim().toUpperCase();
    if (!name) return toast.error("Enter a nickname");
    if (code.length !== 6) return toast.error("Code must be 6 characters");
    setBusy(true);
    try {
      const token = getOrCreatePlayerToken();
      await joinLobby(code, name, token);
      router.push(`/code-red/${code}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <FadeIn className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Code Red</h1>
        <p className="text-muted-foreground">medical codenames</p>
      </div>
      <Card>
        <CardTitle className="sr-only">Nickname</CardTitle>
        <CardContent>
          <div className="flex flex-row items-center gap-2">
            <p className="text-base leading-snug font-medium">Nickname</p>
            <Input
              placeholder="John Smith"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={24}
              autoFocus
            />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Create lobby</CardTitle></CardHeader>
          <CardContent>
            <Button disabled={busy} onClick={handleCreate} className="w-full">
              New lobby
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Join lobby</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="XXXXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 text-center placeholder:text-center tracking-widest font-mono"
              />
              <Button disabled={busy} onClick={handleJoin}>
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
