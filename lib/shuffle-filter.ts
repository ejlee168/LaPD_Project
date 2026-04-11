export type ShuffleFilter = "completed" | "failed" | "unseen";

export const ALL_SHUFFLE_FILTERS: ShuffleFilter[] = ["completed", "failed", "unseen"];

const STORAGE_KEY = "lapd-shuffle-filters";

function isShuffleFilter(value: unknown): value is ShuffleFilter {
  return value === "completed" || value === "failed" || value === "unseen";
}

export function getShuffleFilters(): ShuffleFilter[] {
  if (typeof window === "undefined") return ALL_SHUFFLE_FILTERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_SHUFFLE_FILTERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ALL_SHUFFLE_FILTERS;
    return parsed.filter(isShuffleFilter);
  } catch {
    return ALL_SHUFFLE_FILTERS;
  }
}

export function setShuffleFilters(filters: ShuffleFilter[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}
