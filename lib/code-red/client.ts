"use client";

import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/lib/code-red/types";

function db() {
  return createClient();
}

function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function createLobby(nickname: string, token: string): Promise<string> {
  return unwrap(await db().rpc("cr_create_lobby", {
    p_nickname: nickname, p_player_token: token,
  }));
}

export async function joinLobby(code: string, nickname: string, token: string): Promise<string> {
  return unwrap(await db().rpc("cr_join_lobby", {
    p_code: code, p_nickname: nickname, p_player_token: token,
  }));
}

export async function pickTeam(code: string, token: string, team: Team | null): Promise<void> {
  const { error } = await db().rpc("cr_pick_team", {
    p_code: code, p_player_token: token, p_team: team,
  });
  if (error) throw new Error(error.message);
}

export async function claimSpymaster(code: string, token: string): Promise<void> {
  const { error } = await db().rpc("cr_claim_spymaster", {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}

export async function relinquishSpymaster(code: string, token: string): Promise<void> {
  const { error } = await db().rpc("cr_relinquish_spymaster", {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}

export async function kickPlayer(code: string, token: string, targetId: string): Promise<void> {
  const { error } = await db().rpc("cr_kick_player", {
    p_code: code, p_actor_token: token, p_target_player_id: targetId,
  });
  if (error) throw new Error(error.message);
}

export async function leaveLobby(code: string, token: string): Promise<void> {
  const { error } = await db().rpc("cr_remove_from_lobby", {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}

export async function startGame(code: string, token: string): Promise<string> {
  return unwrap(await db().rpc("cr_start_game", {
    p_code: code, p_player_token: token,
  }));
}

export async function playAgain(code: string, token: string): Promise<void> {
  const { error } = await db().rpc("cr_play_again", {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}

export async function submitClue(code: string, token: string, word: string, count: number): Promise<void> {
  const { error } = await db().rpc("cr_submit_clue", {
    p_code: code, p_player_token: token, p_word: word, p_count: count,
  });
  if (error) throw new Error(error.message);
}

export async function revealCard(code: string, token: string, position: number): Promise<void> {
  const { error } = await db().rpc("cr_reveal_card", {
    p_code: code, p_player_token: token, p_position: position,
  });
  if (error) throw new Error(error.message);
}

export async function endTurn(code: string, token: string): Promise<void> {
  const { error } = await db().rpc("cr_end_turn", {
    p_code: code, p_player_token: token,
  });
  if (error) throw new Error(error.message);
}
