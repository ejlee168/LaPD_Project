import { createClient } from "@/lib/supabase/server";
import { LobbyRoom } from "./lobby-room";
import LobbyNotFound from "./lobby-not-found";
import type { CrLobby, CrPlayer, CrGame, CrCard } from "@/lib/code-red/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `🕵️ Code Red | ${code.toUpperCase()}` };
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

export default async function CodeRedLobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const supabase = await createClient();

  const { data: lobby } = await supabase
    .from("cr_lobbies")
    .select("id, code, status, created_at")
    .eq("code", upper)
    .single<CrLobby>();
  if (!lobby) return <LobbyNotFound />;

  const { data: players } = await supabase
    .from("cr_players")
    .select("id, lobby_id, player_token, nickname, team, is_spymaster, joined_at, last_seen")
    .eq("lobby_id", lobby.id);

  const { data: latestGame } = await supabase
    .from("cr_games")
    .select("id, lobby_id, starting_team, current_team, status, current_clue_word, current_clue_count, guesses_remaining, created_at, ended_at")
    .eq("lobby_id", lobby.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CrGame>();

  let cards: CrCard[] = [];
  if (latestGame) {
    const { data } = await supabase
      .from("cr_cards")
      .select("id, game_id, position, sign_id, card_type, revealed, signs(name)")
      .eq("game_id", latestGame.id)
      .order("position");
    cards = ((data ?? []) as CardRow[]).map((row) => {
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
  }

  return (
    <LobbyRoom
      initialLobby={lobby}
      initialPlayers={(players ?? []) as CrPlayer[]}
      initialGame={latestGame ?? null}
      initialCards={cards}
    />
  );
}
