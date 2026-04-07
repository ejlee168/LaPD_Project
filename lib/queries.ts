import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Diagnosis } from "@/lib/types";

export const getDiagnoses = unstable_cache(
  async (): Promise<Diagnosis[]> => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    );
    const { data } = await supabase
      .from("diagnoses")
      .select("id, name")
      .order("name");
    return (data ?? []) as Diagnosis[];
  },
  ["diagnoses"],
  { revalidate: 3600 }
);
