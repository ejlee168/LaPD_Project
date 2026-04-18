export type Team = "red" | "blue";
export type LobbyStatus = "lobby" | "in_game" | "finished";
export type GameStatus = "in_progress" | "red_win" | "blue_win";
export type CardType = Team | "neutral" | "assassin";
export type ActionType = "clue" | "reveal" | "end_turn" | "game_end";

export interface CrLobby {
  id: string;
  code: string;
  status: LobbyStatus;
  created_at: string;
}

export interface CrPlayer {
  id: string;
  lobby_id: string;
  player_token: string;
  nickname: string;
  team: Team | null;
  is_spymaster: boolean;
  joined_at: string;
  last_seen: string;
}

export interface CrGame {
  id: string;
  lobby_id: string;
  starting_team: Team;
  current_team: Team;
  status: GameStatus;
  current_clue_word: string | null;
  current_clue_count: number | null;
  guesses_remaining: number | null;
  created_at: string;
  ended_at: string | null;
}

export interface CrCard {
  id: string;
  game_id: string;
  position: number;
  sign_id: string;
  card_type: CardType;
  revealed: boolean;
  sign_name?: string;
}

export interface CrAction {
  id: string;
  game_id: string;
  player_id: string | null;
  action_type: ActionType;
  payload: Record<string, unknown> | null;
  created_at: string;
}
