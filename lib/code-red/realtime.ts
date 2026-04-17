"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type Unsub = () => void;

export function subscribeToLobby(
  lobbyId: string,
  onChange: () => void,
): Unsub {
  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    .channel(`cr-lobby-${lobbyId}`)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "cr_lobbies", filter: `id=eq.${lobbyId}` },
      onChange)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "cr_players", filter: `lobby_id=eq.${lobbyId}` },
      onChange)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "cr_games", filter: `lobby_id=eq.${lobbyId}` },
      onChange)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToGame(
  gameId: string,
  onChange: () => void,
): Unsub {
  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    .channel(`cr-game-${gameId}`)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "cr_cards", filter: `game_id=eq.${gameId}` },
      onChange)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "cr_actions", filter: `game_id=eq.${gameId}` },
      onChange)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToPresence(
  code: string,
  token: string,
  nickname: string,
  onSync: (onlineTokens: Set<string>) => void,
): Unsub {
  const supabase: SupabaseClient = createClient();
  const channel = supabase.channel(`cr-presence-${code}`, {
    config: { presence: { key: token } },
  });

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    const online = new Set(Object.keys(state));
    onSync(online);
  });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({ token, nickname });
    }
  });

  return () => { supabase.removeChannel(channel); };
}
