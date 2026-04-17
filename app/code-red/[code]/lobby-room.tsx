"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { subscribeToLobby, subscribeToGame, subscribeToPresence } from "@/lib/code-red/realtime";
import { getOrCreatePlayerToken } from "@/lib/code-red/player-token";
import { joinLobby, startGame, playAgain } from "@/lib/code-red/client";
import { canStartGame } from "@/lib/code-red/rules";
import { LobbyHeader } from "@/components/code-red/lobby-header";
import { TeamPanel } from "@/components/code-red/team-panel";
import { SpectatorList } from "@/components/code-red/spectator-list";
import { Button } from "@/components/ui/button";
import type { CrLobby, CrPlayer, CrGame, CrCard } from "@/lib/code-red/types";

interface Props {
  initialLobby: CrLobby;
  initialPlayers: CrPlayer[];
  initialGame: CrGame | null;
  initialCards: CrCard[];
}

type CardRow = {
  id: string;
  game_id: string;
  position: number;
  sign_id: string;
  card_type: CrCard["card_type"];
  revealed: boolean;
  signs: { name: string } | { name: string }[] | null;
};

export function LobbyRoom({ initialLobby, initialPlayers, initialGame, initialCards }: Props) {
  const router = useRouter();
  const [lobby, setLobby] = useState(initialLobby);
  const [players, setPlayers] = useState(initialPlayers);
  const [game, setGame] = useState(initialGame);
  const [cards, setCards] = useState(initialCards);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [token, setToken] = useState<string>("");

  useEffect(() => { setToken(getOrCreatePlayerToken()); }, []);

  const me = players.find((p) => p.player_token === token) ?? null;

  const refetchLobbyState = useCallback(async () => {
    const supabase = createClient();
    const [{ data: l }, { data: ps }, { data: g }] = await Promise.all([
      supabase.from("cr_lobbies").select("id, code, status, created_at").eq("id", lobby.id).single<CrLobby>(),
      supabase.from("cr_players").select("id, lobby_id, player_token, nickname, team, is_spymaster, joined_at, last_seen").eq("lobby_id", lobby.id),
      supabase.from("cr_games").select("id, lobby_id, starting_team, current_team, status, current_clue_word, current_clue_count, guesses_remaining, created_at, ended_at").eq("lobby_id", lobby.id).order("created_at", { ascending: false }).limit(1).maybeSingle<CrGame>(),
    ]);
    if (l) setLobby(l);
    if (ps) setPlayers(ps as CrPlayer[]);
    setGame(g ?? null);
  }, [lobby.id]);

  const refetchCards = useCallback(async (gameId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("cr_cards")
      .select("id, game_id, position, sign_id, card_type, revealed, signs(name)")
      .eq("game_id", gameId)
      .order("position");
    const rows = ((data ?? []) as CardRow[]).map((row) => {
      const s = Array.isArray(row.signs) ? row.signs[0] : row.signs;
      return {
        id: row.id,
        game_id: row.game_id,
        position: row.position,
        sign_id: row.sign_id,
        card_type: row.card_type,
        revealed: row.revealed,
        sign_name: s?.name,
      };
    });
    setCards(rows);
  }, []);

  useEffect(() => {
    const unsub = subscribeToLobby(lobby.id, () => { void refetchLobbyState(); });
    return unsub;
  }, [lobby.id, refetchLobbyState]);

  useEffect(() => {
    if (!game) return;
    void refetchCards(game.id);
    const unsub = subscribeToGame(game.id, () => { void refetchCards(game.id); });
    return unsub;
  }, [game, refetchCards]);

  useEffect(() => {
    if (!token || !me) return;
    const unsub = subscribeToPresence(lobby.code, token, me.nickname, setOnline);
    return unsub;
  }, [lobby.code, token, me]);

  useEffect(() => {
    if (!token) return;
    if (me) return;
    const nickname = window.prompt("Nickname for this lobby?");
    if (!nickname) {
      router.push("/code-red");
      return;
    }
    joinLobby(lobby.code, nickname.trim().slice(0, 24), token)
      .then(() => refetchLobbyState())
      .catch((e) => {
        toast.error((e as Error).message);
        router.push("/code-red");
      });
  }, [token, me, lobby.code, router, refetchLobbyState]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <LobbyHeader code={lobby.code} me={me} token={token} />
      {lobby.status !== "in_game" ? (
        <>
          {lobby.status === "finished" && game && (
            <div className="rounded-lg border px-4 py-2 text-sm text-center">
              Last game: <span className="font-medium">{game.status.replace("_", " ")}</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TeamPanel code={lobby.code} token={token} team="red"  players={players} me={me} online={online} />
            <TeamPanel code={lobby.code} token={token} team="blue" players={players} me={me} online={online} />
          </div>
          <SpectatorList players={players} online={online} />
          <div className="flex justify-center gap-2">
            {lobby.status === "lobby" && (
              <Button
                disabled={!canStartGame(players)}
                onClick={async () => {
                  try { await startGame(lobby.code, token); }
                  catch (e) { toast.error((e as Error).message); }
                }}
              >
                Start game
              </Button>
            )}
            {lobby.status === "finished" && (
              <Button
                onClick={async () => {
                  try { await playAgain(lobby.code, token); }
                  catch (e) { toast.error((e as Error).message); }
                }}
              >
                Play again
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground text-sm">Game board coming in Task 14.</p>
      )}
    </div>
  );
}
