export interface GameAttempt {
  result: "won" | "lost";
  cluesUsed: number;
  timestamp: number;
}

const STORAGE_KEY = "lapd-attempts";

function getAttempts(): Record<string, GameAttempt> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getAttempt(gameId: string): GameAttempt | null {
  return getAttempts()[gameId] ?? null;
}

export function saveAttempt(gameId: string, result: "won" | "lost", cluesUsed: number) {
  const attempts = getAttempts();
  attempts[gameId] = { result, cluesUsed, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
}

export function getAllAttempts(): Record<string, GameAttempt> {
  return getAttempts();
}
