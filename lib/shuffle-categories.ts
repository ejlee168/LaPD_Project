import { CATEGORY_META } from "@/lib/categories";

export const ALL_SHUFFLE_CATEGORIES: string[] = Object.keys(CATEGORY_META);

const STORAGE_KEY = "lapd-shuffle-categories";

function isKnownCategory(value: unknown): value is string {
  return typeof value === "string" && value in CATEGORY_META;
}

export function getShuffleCategories(): string[] {
  if (typeof window === "undefined") return ALL_SHUFFLE_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_SHUFFLE_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ALL_SHUFFLE_CATEGORIES;
    const filtered = parsed.filter(isKnownCategory);
    return filtered.length === 0 ? ALL_SHUFFLE_CATEGORIES : filtered;
  } catch {
    return ALL_SHUFFLE_CATEGORIES;
  }
}

export function setShuffleCategories(categories: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}
