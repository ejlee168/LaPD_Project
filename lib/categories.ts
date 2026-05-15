export interface CategoryMeta {
  emoji: string;
  bg: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  Dermatology: { emoji: "🩹", bg: "bg-pink-100 dark:bg-pink-950/40" },
  Endocrinology: { emoji: "🍬", bg: "bg-amber-100 dark:bg-amber-950/40" },
  Gastrointestinal: { emoji: "🍽️", bg: "bg-orange-100 dark:bg-orange-950/40" },
  "General Med": { emoji: "🩺", bg: "bg-slate-100 dark:bg-slate-800/50" },
  Haematology: { emoji: "🩸", bg: "bg-red-100 dark:bg-red-950/40" },
  Respiratory: { emoji: "🫁", bg: "bg-sky-100 dark:bg-sky-950/40" },
  Cardiovascular: { emoji: "🫀", bg: "bg-rose-100 dark:bg-rose-950/40" },
  Musculoskeletal: { emoji: "🦴", bg: "bg-stone-100 dark:bg-stone-800/50" },
  Reproductive: { emoji: "🤰", bg: "bg-fuchsia-100 dark:bg-fuchsia-950/40" },
  Neurology: { emoji: "🧠", bg: "bg-purple-100 dark:bg-purple-950/40" },
  Nephrology: { emoji: "🫘", bg: "bg-violet-100 dark:bg-violet-950/40" },
  Ophthalmology: { emoji: "👁️", bg: "bg-cyan-100 dark:bg-cyan-950/40" },
  ENT: { emoji: "👂", bg: "bg-yellow-100 dark:bg-yellow-950/40" },
  Psychiatry: { emoji: "💭", bg: "bg-indigo-100 dark:bg-indigo-950/40" },
};
