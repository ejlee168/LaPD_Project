const KEY = "code-red:player-token";

export function getOrCreatePlayerToken(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.localStorage.setItem(KEY, token);
  return token;
}
