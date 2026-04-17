"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  pickTeam,
  claimSpymaster,
  relinquishSpymaster,
} from "@/lib/code-red/client";
import { canClaimSpymaster } from "@/lib/code-red/rules";
import type { CrPlayer, Team } from "@/lib/code-red/types";

interface Props {
  code: string;
  token: string;
  team: Team;
  players: CrPlayer[];
  me: CrPlayer | null;
  online: Set<string>;
}

export function TeamPanel({ code, token, team, players, me, online }: Props) {
  const onTeam = players.filter((p) => p.team === team);
  const iAmOnThisTeam = me?.team === team;

  async function run(fn: () => Promise<unknown>) {
    try { await fn(); } catch (e) { toast.error((e as Error).message); }
  }

  const accent = team === "red"
    ? "ring-red-500/40 bg-red-500/5"
    : "ring-blue-500/40 bg-blue-500/5";
  const label = team === "red" ? "Red team" : "Blue team";

  return (
    <Card className={cn("ring-2", accent)}>
      <CardHeader><CardTitle>{label} ({onTeam.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1">
          {onTeam.length === 0 && (
            <li className="text-muted-foreground text-sm">No one here yet</li>
          )}
          {onTeam.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  online.has(p.player_token) ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
              />
              <span>{p.nickname}</span>
              {p.id === me?.id && (
                <span className="text-xs text-muted-foreground">(you)</span>
              )}
              {p.is_spymaster && (
                <span className="text-xs rounded bg-foreground/10 px-1.5 py-0.5">spy</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {!iAmOnThisTeam && (
            <Button size="sm" onClick={() => run(() => pickTeam(code, token, team))}>
              Join {team}
            </Button>
          )}
          {iAmOnThisTeam && (
            <Button size="sm" variant="outline" onClick={() => run(() => pickTeam(code, token, null))}>
              Leave team
            </Button>
          )}
          {iAmOnThisTeam && !me?.is_spymaster && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!canClaimSpymaster(players, me)}
              onClick={() => run(() => claimSpymaster(code, token))}
            >
              Be spymaster
            </Button>
          )}
          {iAmOnThisTeam && me?.is_spymaster && (
            <Button size="sm" variant="secondary"
              onClick={() => run(() => relinquishSpymaster(code, token))}>
              Step down
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
