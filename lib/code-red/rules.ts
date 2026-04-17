import type { CrGame, CrPlayer, Team } from "@/lib/code-red/types";

export function teamCounts(players: CrPlayer[], team: Team) {
  let total = 0;
  let spymasters = 0;
  for (const p of players) {
    if (p.team !== team) continue;
    total += 1;
    if (p.is_spymaster) spymasters += 1;
  }
  return { total, spymasters, operatives: total - spymasters };
}

export function canClaimSpymaster(players: CrPlayer[], me: CrPlayer | null): boolean {
  if (!me || !me.team || me.is_spymaster) return false;
  const { total, spymasters } = teamCounts(players, me.team);
  const allowed = total >= 5 ? 2 : 1;
  return spymasters < allowed;
}

export function canStartGame(players: CrPlayer[]): boolean {
  const red = teamCounts(players, "red");
  const blue = teamCounts(players, "blue");
  return red.spymasters >= 1 && red.operatives >= 1
      && blue.spymasters >= 1 && blue.operatives >= 1;
}

export function isYourTurnToClue(game: CrGame | null, me: CrPlayer | null): boolean {
  if (!game || !me) return false;
  return game.status === "in_progress"
      && me.is_spymaster
      && me.team === game.current_team
      && !game.current_clue_word;
}

export function isYourTurnToGuess(game: CrGame | null, me: CrPlayer | null): boolean {
  if (!game || !me) return false;
  return game.status === "in_progress"
      && !me.is_spymaster
      && me.team === game.current_team
      && !!game.current_clue_word
      && (game.guesses_remaining ?? 0) > 0;
}
